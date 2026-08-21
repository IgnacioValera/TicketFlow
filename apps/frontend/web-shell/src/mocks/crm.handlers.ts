import { http, HttpResponse } from 'msw'
import type {
  CrmClient,
  CrmContact,
  CrmDashboard,
  CrmOpportunity,
  CrmSurvey,
  CrmSurveyQuestion,
  OpportunityStage,
  SurveyQuestionType,
  SurveyResults,
  SurveyStatus,
  SurveyTrigger,
} from '@/types/crm.types'
import { PROBABILITY_BY_STAGE } from '@/types/crm.types'
import type { User } from '@/types/user.types'
import { isValidClientPhone, normalizeClientPhone } from '@/utils/client-form'
import { toCsv } from '@/utils/csv'
import { calculateNps } from '@/utils/nps'
import { calculateClientScore } from '@/utils/crm-score'
import { invitationCardStatus } from '@/utils/opportunity-survey'
import { PERMISSIONS } from '@/constants/permissions'
import { optionBreakdown, ratingBreakdown } from '@/utils/survey-form'

let mockClients: CrmClient[] = [
  {
    id: 'c1',
    name: 'Acme Corp',
    industry: 'Tecnología',
    region: 'Centro',
    tier: 'GOLD',
    segment: 'ENTERPRISE',
    email: 'contacto@acme.test',
    phone: '7771112233',
    status: 'ACTIVE',
    score: 92,
    ownerId: '1',
    ownerName: 'Admin Sistema',
    createdAt: '2025-01-15T00:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'Globex',
    industry: 'Manufactura',
    region: 'Norte',
    tier: 'SILVER',
    segment: 'MID_MARKET',
    email: 'contacto@globex.test',
    phone: '7772223344',
    status: 'ACTIVE',
    score: 78,
    ownerId: '1',
    ownerName: 'Admin Sistema',
    createdAt: '2025-03-20T00:00:00.000Z',
  },
  {
    id: 'c3',
    name: 'Initech',
    industry: 'Servicios',
    region: 'Sur',
    tier: 'BRONZE',
    segment: 'SMB',
    email: 'contacto@initech.test',
    phone: '7773334455',
    status: 'PROSPECT',
    score: 61,
    ownerId: null,
    ownerName: null,
    createdAt: '2025-06-10T00:00:00.000Z',
  },
]

function jsonOk(data: unknown, meta: unknown = null, message = 'OK') {
  return HttpResponse.json({ success: true, message, data, meta })
}

function filterClients(url: URL) {
  const status = url.searchParams.get('status')
  const segment = url.searchParams.get('segment')
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
  return mockClients.filter((client) => {
    if (status && client.status !== status) return false
    if (segment && client.segment !== segment) return false
    if (
      search &&
      !`${client.name} ${client.email} ${client.industry} ${client.region} ${client.phone}`
        .toLowerCase()
        .includes(search)
    ) {
      return false
    }
    return true
  })
}

function clientsExportCsv(clients: CrmClient[]) {
  return toCsv(
    clients.map((item) => ({
      nombre: item.name,
      giro: item.industry,
      region: item.region,
      segmento: item.segment,
      nivel: item.tier,
      correo: item.email,
      telefono: item.phone,
      estado: item.status,
      score: item.score,
      propietario: item.ownerName ?? '',
    })),
  )
}

const mockContacts: CrmContact[] = [
  {
    id: 'ct1',
    clientId: 'c1',
    clientName: 'Acme Corp',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@acme.test',
    phone: '7771110000',
    jobTitle: 'Compras',
    isPrimary: true,
  },
]

const mockDashboard: CrmDashboard = {
  pipeline: [
    { stage: 'NEW', count: 1, amount: 10000 },
    { stage: 'QUALIFICATION', count: 1, amount: 25000 },
    { stage: 'PROPOSAL', count: 1, amount: 40000 },
    { stage: 'NEGOTIATION', count: 1, amount: 15000 },
    { stage: 'WON', count: 1, amount: 30000 },
    { stage: 'LOST', count: 1, amount: 8000 },
  ],
  conversionRate: 50,
  nps: { nps: 33, promoters: 2, passives: 1, detractors: 1, total: 4 },
  activitiesDue: 2,
  pendingActivities: 3,
  wonThisMonth: 1,
  wonAmountThisMonth: 30000,
  lostThisMonth: 1,
  activeClients: mockClients.filter((client) => client.status === 'ACTIVE').length,
  contacts: 4,
  openOpportunities: 4,
  openPipelineAmount: 90000,
  topClients: mockClients.map((client) => ({
    id: client.id,
    name: client.name,
    score: client.score,
    segment: client.segment,
  })),
}

function json(data: unknown, message = 'OK', status = 200) {
  return HttpResponse.json({ success: true, message, data, meta: null }, { status })
}

function jsonError(message: string, status: number) {
  return HttpResponse.json({ success: false, message, data: null, meta: null }, { status })
}

function nowIso() {
  return new Date().toISOString()
}

function randomToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function publicSurveyUrl(token: string, request: Request) {
  const referer = request.headers.get('referer') || request.headers.get('origin')
  const fromReferer = referer ? new URL(referer).origin : ''
  const fromLocation = typeof location !== 'undefined' && location.origin ? location.origin : ''
  const origin = (fromLocation || fromReferer).replace(/\/$/, '')
  return `${origin}/public/surveys/${token}`
}

function actor(request: Request, users: User[]) {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return undefined
  const token = header.replace('Bearer ', '')
  if (token === 'mock-token-refreshed') return users[0]
  return users.find((user) => user.id === token.replace('mock-token-', ''))
}

function denyUnless(request: Request, users: User[], permission: string) {
  const user = actor(request, users)
  if (!user) return jsonError('No autenticado', 401)
  if (!user.permissions.includes(permission)) {
    return jsonError('No tienes permisos para realizar esta acción', 403)
  }
  return null
}

const OPEN_STAGES: OpportunityStage[] = ['NEW', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION']

function stagesForStatus(status: string | null) {
  if (status === 'WON') return ['WON'] as OpportunityStage[]
  if (status === 'LOST') return ['LOST'] as OpportunityStage[]
  if (status === 'OPEN') return OPEN_STAGES
  return null
}

const npsQuestion: CrmSurveyQuestion = {
  id: 'q-nps',
  prompt: 'Del 0 al 10, ¿qué tan probable es que nos recomiendes?',
  type: 'NPS',
  required: true,
  position: 0,
  options: [],
}

const yesNoQuestion: CrmSurveyQuestion = {
  id: 'q-yesno',
  prompt: '¿Volverías a contratar?',
  type: 'YES_NO',
  required: true,
  position: 1,
  options: [
    { id: 'opt-yes', label: 'Sí', value: 'yes' },
    { id: 'opt-no', label: 'No', value: 'no' },
  ],
}

const emptyNpsQuestion: CrmSurveyQuestion = {
  id: 'q-empty-nps',
  prompt: 'Del 0 al 10, ¿qué tan probable es que nos recomiendes?',
  type: 'NPS',
  required: true,
  position: 0,
  options: [],
}

const emptyYesNo: CrmSurveyQuestion = {
  id: 'q-empty-yes',
  prompt: '¿Volverías a contratar?',
  type: 'YES_NO',
  required: true,
  position: 1,
  options: [
    { id: 'opt-empty-yes', label: 'Sí', value: 'yes' },
    { id: 'opt-empty-no', label: 'No', value: 'no' },
  ],
}

const surveys: CrmSurvey[] = [
  {
    id: 's-draft',
    title: 'Borrador interno',
    description: 'Encuesta aún no publicada.',
    status: 'DRAFT',
    trigger: 'MANUAL',
    questionCount: 1,
    questions: [
      {
        id: 'q-draft',
        prompt: '¿Qué te pareció el servicio?',
        type: 'TEXT',
        required: true,
        position: 0,
        options: [],
      },
    ],
  },
  {
    id: 's-nps',
    title: 'NPS de cliente',
    description: 'Resultados reales de recomendación.',
    status: 'PUBLISHED',
    trigger: 'MANUAL',
    questionCount: 2,
    questions: [npsQuestion, yesNoQuestion],
  },
  {
    id: 's-empty',
    title: 'Encuesta sin respuestas',
    description: 'Activa y lista para responder.',
    status: 'PUBLISHED',
    trigger: 'MANUAL',
    questionCount: 2,
    questions: [emptyNpsQuestion, emptyYesNo],
  },
  {
    id: 's-closed',
    title: 'Encuesta inactiva',
    description: 'Ya no acepta respuestas.',
    status: 'CLOSED',
    trigger: 'OPPORTUNITY_WON',
    questionCount: 1,
    questions: [
      {
        id: 'q-closed',
        prompt: '¿Cómo calificarías la atención?',
        type: 'RATING',
        required: true,
        position: 0,
        options: [],
      },
    ],
  },
]

type StoredInvitation = {
  token: string
  surveyId: string
  opportunityId: string | null
  clientId: string | null
  usedAt: string | null
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  trigger: SurveyTrigger
}

const invitations: StoredInvitation[] = [
  {
    token: 'demo-active-token',
    surveyId: 's-empty',
    opportunityId: null,
    clientId: null,
    usedAt: null,
    expiresAt: '2099-01-01T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    trigger: 'MANUAL',
  },
  {
    token: 'demo-used-token',
    surveyId: 's-nps',
    opportunityId: null,
    clientId: 'c1',
    usedAt: '2026-08-01T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    trigger: 'MANUAL',
  },
  {
    token: 'demo-closed-token',
    surveyId: 's-closed',
    opportunityId: null,
    clientId: null,
    usedAt: null,
    expiresAt: '2099-01-01T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    trigger: 'OPPORTUNITY_WON',
  },
  {
    token: 'demo-expired-token',
    surveyId: 's-empty',
    opportunityId: null,
    clientId: null,
    usedAt: null,
    expiresAt: '2020-01-01T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2019-12-01T00:00:00.000Z',
    trigger: 'MANUAL',
  },
  {
    token: 'demo-expired-opp-token',
    surveyId: 's-nps',
    opportunityId: 'o-soporte',
    clientId: 'c3',
    usedAt: null,
    expiresAt: '2020-01-01T00:00:00.000Z',
    revokedAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    trigger: 'MANUAL',
  },
]

type StoredAnswer = { questionId: string; textValue?: string | null; numberValue?: number | null; optionIds?: string[] | null }

const responses: Array<{
  id: string
  surveyId: string
  npsScore: number | null
  answers: StoredAnswer[]
  opportunityId: string | null
  opportunityTitle: string | null
  clientId: string | null
  clientName: string | null
  trigger: SurveyTrigger
  invitedAt: string
  submittedAt: string
}> = [
  {
    id: 'r1',
    surveyId: 's-nps',
    npsScore: 9,
    answers: [{ questionId: 'q-nps', numberValue: 9 }, { questionId: 'q-yesno', optionIds: ['opt-yes'] }],
    opportunityId: null,
    opportunityTitle: null,
    clientId: 'c1',
    clientName: 'Acme Corp',
    trigger: 'MANUAL',
    invitedAt: '2026-07-20T00:00:00.000Z',
    submittedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'r2',
    surveyId: 's-nps',
    npsScore: 10,
    answers: [{ questionId: 'q-nps', numberValue: 10 }, { questionId: 'q-yesno', optionIds: ['opt-yes'] }],
    opportunityId: null,
    opportunityTitle: null,
    clientId: 'c1',
    clientName: 'Acme Corp',
    trigger: 'MANUAL',
    invitedAt: '2026-07-21T00:00:00.000Z',
    submittedAt: '2026-08-02T00:00:00.000Z',
  },
  {
    id: 'r3',
    surveyId: 's-nps',
    npsScore: 6,
    answers: [{ questionId: 'q-nps', numberValue: 6 }, { questionId: 'q-yesno', optionIds: ['opt-no'] }],
    opportunityId: null,
    opportunityTitle: null,
    clientId: 'c2',
    clientName: 'Globex',
    trigger: 'MANUAL',
    invitedAt: '2026-07-22T00:00:00.000Z',
    submittedAt: '2026-08-03T00:00:00.000Z',
  },
]

const opportunities: CrmOpportunity[] = [
  {
    id: 'o-renovacion',
    clientId: 'c1',
    clientName: 'Acme Corp',
    contactId: 'ct1',
    contactName: 'Ana Pérez',
    ownerId: '1',
    ownerName: 'Admin Sistema',
    title: 'Renovación',
    amount: 100000,
    currency: 'MXN',
    probability: 10,
    stage: 'NEW',
    expectedCloseDate: '2026-09-15',
    lostReason: null,
    notes: '',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'o-expansion',
    clientId: 'c1',
    clientName: 'Acme Corp',
    contactId: null,
    contactName: null,
    ownerId: '1',
    ownerName: 'Admin Sistema',
    title: 'Expansión',
    amount: 30000,
    currency: 'MXN',
    probability: 25,
    stage: 'QUALIFICATION',
    expectedCloseDate: '2026-10-01',
    lostReason: null,
    notes: '',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  },
  {
    id: 'o-licencias',
    clientId: 'c2',
    clientName: 'Globex',
    contactId: null,
    contactName: null,
    ownerId: '1',
    ownerName: 'Admin Sistema',
    title: 'Licencias',
    amount: 40000,
    currency: 'MXN',
    probability: 50,
    stage: 'PROPOSAL',
    expectedCloseDate: '2026-11-01',
    lostReason: null,
    notes: '',
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
  },
  {
    id: 'o-soporte',
    clientId: 'c3',
    clientName: 'Initech',
    contactId: null,
    contactName: null,
    ownerId: '1',
    ownerName: 'Admin Sistema',
    title: 'Soporte anual',
    amount: 30000,
    currency: 'MXN',
    probability: 100,
    stage: 'WON',
    expectedCloseDate: '2026-06-01',
    lostReason: null,
    notes: '',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
]

const invitationLocks = new Set<string>()
const MOCK_STORE_KEY = 'ticketflow-msw-crm'

function persistMockStore() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MOCK_STORE_KEY, JSON.stringify({ surveys, invitations, responses, opportunities }))
}

function hydrateMockStore() {
  if (typeof localStorage === 'undefined') return
  const raw = localStorage.getItem(MOCK_STORE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as {
      surveys?: CrmSurvey[]
      invitations?: StoredInvitation[]
      responses?: typeof responses
      opportunities?: CrmOpportunity[]
    }
    if (parsed.surveys?.length) surveys.splice(0, surveys.length, ...parsed.surveys)
    if (parsed.invitations) invitations.splice(0, invitations.length, ...parsed.invitations)
    if (parsed.responses) responses.splice(0, responses.length, ...parsed.responses)
    if (parsed.opportunities?.length) opportunities.splice(0, opportunities.length, ...parsed.opportunities)
  } catch {
    localStorage.removeItem(MOCK_STORE_KEY)
  }
}

hydrateMockStore()

function serialize(survey: CrmSurvey): CrmSurvey {
  const questions = [...(survey.questions ?? [])].sort((a, b) => a.position - b.position)
  return { ...survey, questionCount: questions.length, questions }
}

function buildResults(survey: CrmSurvey): SurveyResults {
  const surveyResponses = responses.filter((item) => item.surveyId === survey.id)
  const questions = [...(survey.questions ?? [])].sort((a, b) => a.position - b.position)
  const hasNps = questions.some((question) => question.type === 'NPS')
  const npsScores = surveyResponses.map((item) => item.npsScore).filter((score): score is number => score !== null)
  return {
    survey: serialize(survey),
    totalResponses: surveyResponses.length,
    nps: hasNps ? calculateNps(npsScores) : null,
    responses: surveyResponses.map((item) => ({
      id: item.id,
      opportunityId: item.opportunityId,
      opportunityTitle: item.opportunityTitle,
      clientId: item.clientId,
      clientName: item.clientName,
      trigger: item.trigger,
      invitedAt: item.invitedAt,
      submittedAt: item.submittedAt,
      npsScore: item.npsScore,
    })),
    questions: questions.map((question) => {
      const answers = surveyResponses.flatMap((item) => item.answers.filter((answer) => answer.questionId === question.id))
      const choice = question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE' || question.type === 'YES_NO'
      return {
        id: question.id,
        prompt: question.prompt,
        type: question.type,
        required: question.required,
        answerCount: answers.length,
        options: choice ? optionBreakdown(question.options, answers) : undefined,
        ratings: question.type === 'RATING'
          ? ratingBreakdown(answers, 1, 5)
          : question.type === 'NPS'
            ? ratingBreakdown(answers, 0, 10)
            : undefined,
        texts: question.type === 'TEXT'
          ? answers.map((answer) => answer.textValue?.trim()).filter((value): value is string => Boolean(value))
          : undefined,
      }
    }),
  }
}

function surveyCard(opportunity: CrmOpportunity) {
  const published = surveys.find((item) => item.status === 'PUBLISHED' && item.trigger === 'OPPORTUNITY_WON')
  const preferred = published
    ? invitations.find((item) => item.opportunityId === opportunity.id && item.surveyId === published.id)
    : invitations
      .filter((item) => item.opportunityId === opportunity.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const status = invitationCardStatus({
    hasPublishedAutomaticSurvey: Boolean(published),
    invitation: preferred
      ? { usedAt: preferred.usedAt, expiresAt: preferred.expiresAt, revokedAt: preferred.revokedAt }
      : null,
  })
  const survey = preferred ? surveys.find((item) => item.id === preferred.surveyId) : published
  return {
    status,
    surveyId: preferred?.surveyId ?? published?.id ?? null,
    surveyTitle: survey?.title ?? null,
    trigger: preferred?.trigger ?? published?.trigger ?? null,
    createdAt: preferred?.createdAt ?? null,
    expiresAt: preferred?.expiresAt ?? null,
    usedAt: preferred?.usedAt ?? null,
  }
}

function serializeOpportunity(item: CrmOpportunity, withCard = false) {
  return withCard ? { ...item, surveyInvitation: surveyCard(item) } : item
}

export function createCrmHandlers(users: User[] = []) {
  const createOrRegenerate = (
    opportunity: CrmOpportunity,
    survey: CrmSurvey,
    request: Request,
    confirmRegenerate: boolean,
  ) => {
    const lockKey = `${opportunity.id}:${survey.id}`
    if (invitationLocks.has(lockKey)) {
      return jsonError('Ya existe una invitación vigente para esta oportunidad.', 409)
    }
    invitationLocks.add(lockKey)
    try {
      const existing = invitations.find((item) => item.opportunityId === opportunity.id && item.surveyId === survey.id)
      if (existing?.usedAt) return jsonError('La encuesta ya fue respondida', 409)
      const status = invitationCardStatus({
        hasPublishedAutomaticSurvey: true,
        invitation: existing
          ? { usedAt: existing.usedAt, expiresAt: existing.expiresAt, revokedAt: existing.revokedAt }
          : null,
      })
      if (existing && (status === 'PENDING' || status === 'EXPIRED' || status === 'REVOKED') && !confirmRegenerate) {
        return jsonError('Confirma la regeneración del enlace. El enlace anterior dejará de funcionar.', 409)
      }
      const token = randomToken()
      const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
      if (existing) {
        existing.token = token
        existing.expiresAt = expiresAt
        existing.usedAt = null
        existing.revokedAt = null
        existing.createdAt = nowIso()
        existing.trigger = survey.trigger
        existing.clientId = opportunity.clientId
      } else {
        invitations.push({
          token,
          surveyId: survey.id,
          opportunityId: opportunity.id,
          clientId: opportunity.clientId,
          usedAt: null,
          expiresAt,
          revokedAt: null,
          createdAt: nowIso(),
          trigger: survey.trigger,
        })
      }
      persistMockStore()
      return json({
        created: true,
        surveyId: survey.id,
        surveyTitle: survey.title,
        responseUrl: publicSurveyUrl(token, request),
        expiresAt,
      }, 'Enlace generado')
    } finally {
      invitationLocks.delete(lockKey)
    }
  }

  return [
    http.get('*/api/v1/crm/dashboard', () =>
      HttpResponse.json({ success: true, message: 'OK', data: mockDashboard, meta: null }),
    ),
    http.get('*/api/v1/crm/clients/export', ({ request }) => {
      const csv = clientsExportCsv(filterClients(new URL(request.url)))
      return new HttpResponse(`\uFEFF${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="clientes.csv"',
        },
      })
    }),
    http.get('*/api/v1/crm/clients/:id/360', ({ params }) => {
      const client = mockClients.find((item) => item.id === params.id)
      if (!client) return jsonError('Cliente no encontrado', 404)
      const clientOpps = opportunities.filter((item) => item.clientId === client.id)
      const score = calculateClientScore({
        ticketRatings: [],
        crmNpsScores: [],
        wonCount: clientOpps.filter((item) => item.stage === 'WON').length,
        lostCount: clientOpps.filter((item) => item.stage === 'LOST').length,
        completedActivities90d: 0,
        totalActivities: 0,
        closedTickets: 0,
        totalTickets: 0,
        ageDays: Math.max(0, Math.floor((Date.now() - new Date(client.createdAt).getTime()) / 86400000)),
      })
      return jsonOk({
        client,
        kpis: {
          score: score.score,
          insufficient: score.insufficient,
          factors: score.factors,
          updatedAt: nowIso(),
          contacts: 1,
          openOpportunities: clientOpps.filter((item) => item.stage !== 'WON' && item.stage !== 'LOST').length,
          wonAmount: 30000,
          openTickets: 0,
        },
        contacts: [
          {
            id: 'ct1',
            clientId: client.id,
            clientName: client.name,
            firstName: 'Ana',
            lastName: 'López',
            email: 'ana@' + client.email.split('@')[1],
            phone: client.phone,
            jobTitle: 'Gerente',
            isPrimary: true,
          },
        ],
        opportunities: [{ id: 'o1', title: 'Renovación', amount: 10000, stage: 'PROPOSAL', probability: 50 }],
        activities: [],
        tickets: [],
        timeline: [],
      })
    }),
    http.get('*/api/v1/crm/clients/:id', ({ params }) => {
      const client = mockClients.find((item) => item.id === params.id)
      if (!client) return jsonError('Cliente no encontrado', 404)
      return jsonOk(client)
    }),
    http.get('*/api/v1/crm/clients', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const perPage = Number(url.searchParams.get('perPage') ?? 10)
      const items = filterClients(url)
      const start = (page - 1) * perPage
      return jsonOk(items.slice(start, start + perPage), {
        page,
        perPage,
        total: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / perPage) || 1),
      })
    }),
    http.post('*/api/v1/crm/clients', async ({ request }) => {
      const body = (await request.json()) as Partial<CrmClient>
      if (mockClients.some((item) => item.name.toLowerCase() === String(body.name ?? '').trim().toLowerCase())) {
        return jsonError('Ya existe un cliente con ese nombre', 409)
      }
      if (mockClients.some((item) => item.email.toLowerCase() === String(body.email ?? '').trim().toLowerCase())) {
        return jsonError('Ya existe un cliente con ese correo', 409)
      }
      if (body.phone && !isValidClientPhone(String(body.phone))) {
        return jsonError('El teléfono debe tener entre 8 y 10 dígitos', 400)
      }
      const client: CrmClient = {
        id: `c${Date.now()}`,
        name: String(body.name ?? '').trim(),
        industry: String(body.industry ?? '').trim(),
        region: String(body.region ?? '').trim(),
        tier: (body.tier as CrmClient['tier']) ?? 'BRONZE',
        segment: (body.segment as CrmClient['segment']) ?? 'SMB',
        email: String(body.email ?? '').trim().toLowerCase(),
        phone: normalizeClientPhone(String(body.phone ?? '')),
        status: (body.status as CrmClient['status']) ?? 'PROSPECT',
        score: 50,
        ownerId: '1',
        ownerName: 'Admin Sistema',
        createdAt: new Date().toISOString(),
      }
      mockClients = [client, ...mockClients]
      return jsonOk(client, null, 'Cliente creado')
    }),
    http.put('*/api/v1/crm/clients/:id', async ({ params, request }) => {
      const index = mockClients.findIndex((item) => item.id === params.id)
      if (index === -1) return jsonError('Cliente no encontrado', 404)
      const body = (await request.json()) as Partial<CrmClient>
      const current = mockClients[index]
      const nextName = body.name?.trim() ?? current.name
      const nextEmail = body.email?.trim().toLowerCase() ?? current.email
      if (mockClients.some((item) => item.id !== current.id && item.name.toLowerCase() === nextName.toLowerCase())) {
        return jsonError('Ya existe un cliente con ese nombre', 409)
      }
      if (mockClients.some((item) => item.id !== current.id && item.email.toLowerCase() === nextEmail)) {
        return jsonError('Ya existe un cliente con ese correo', 409)
      }
      mockClients[index] = {
        ...current,
        ...body,
        name: nextName,
        email: nextEmail,
        phone: body.phone ? normalizeClientPhone(body.phone) : current.phone,
      }
      return jsonOk(mockClients[index], null, 'Cliente actualizado')
    }),
    http.get('*/api/v1/crm/contacts', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const perPage = Number(url.searchParams.get('perPage') ?? 10)
      const clientId = url.searchParams.get('clientId')
      const search = (url.searchParams.get('search') ?? '').toLowerCase()
      let items = clientId ? mockContacts.filter((item) => item.clientId === clientId) : mockContacts
      if (search) {
        items = items.filter((item) =>
          `${item.firstName} ${item.lastName} ${item.email} ${item.clientName}`.toLowerCase().includes(search),
        )
      }
      const start = (page - 1) * perPage
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: items.slice(start, start + perPage),
        meta: { page, perPage, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / perPage)) },
      })
    }),
    http.post('*/api/v1/crm/contacts', async ({ request }) => {
      const denied = denyUnless(request, users, PERMISSIONS.CRM_CONTACT_CREATE)
      if (denied) return denied
      const body = (await request.json()) as Partial<CrmContact> & { clientId?: string; firstName?: string; lastName?: string; email?: string }
      if (!body.clientId) return jsonError('Selecciona un cliente', 400)
      if (!body.firstName?.trim() || !body.lastName?.trim()) return jsonError('El nombre es obligatorio y no puede contener solo espacios', 400)
      if (!body.email?.trim()) return jsonError('El correo es obligatorio y no puede contener solo espacios', 400)
      const client = mockClients.find((item) => item.id === body.clientId)
      if (!client) return jsonError('Cliente no encontrado', 404)
      const email = body.email.toLowerCase().trim()
      if (mockContacts.some((item) => item.clientId === client.id && item.email === email)) {
        return jsonError('Ya existe un contacto con ese correo para este cliente', 409)
      }
      const created: CrmContact = {
        id: `ct-${Date.now()}`,
        clientId: client.id,
        clientName: client.name,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        email,
        phone: body.phone ?? '',
        jobTitle: body.jobTitle ?? '',
        isPrimary: Boolean(body.isPrimary),
      }
      mockContacts.push(created)
      return jsonOk(created, null, 'Contacto creado')
    }),
    http.put('*/api/v1/crm/contacts/:id', async ({ request, params }) => {
      const denied = denyUnless(request, users, PERMISSIONS.CRM_CONTACT_EDIT)
      if (denied) return denied
      const id = String(params.id)
      const index = mockContacts.findIndex((item) => item.id === id)
      if (index === -1) return jsonError('Contacto no encontrado', 404)
      const body = (await request.json()) as Partial<CrmContact>
      const current = mockContacts[index]
      const clientId = body.clientId ?? current.clientId
      const client = mockClients.find((item) => item.id === clientId)
      if (!client) return jsonError('Cliente no encontrado', 404)
      const email = (body.email ?? current.email).toLowerCase().trim()
      if (mockContacts.some((item) => item.id !== current.id && item.clientId === client.id && item.email === email)) {
        return jsonError('Ya existe un contacto con ese correo para este cliente', 409)
      }
      mockContacts[index] = {
        ...current,
        clientId: client.id,
        clientName: client.name,
        firstName: body.firstName?.trim() || current.firstName,
        lastName: body.lastName?.trim() || current.lastName,
        email,
        phone: body.phone ?? current.phone,
        jobTitle: body.jobTitle ?? current.jobTitle,
      }
      return jsonOk(mockContacts[index], null, 'Contacto actualizado')
    }),
    http.delete('*/api/v1/crm/contacts/:id', ({ request, params }) => {
      const denied = denyUnless(request, users, PERMISSIONS.CRM_CONTACT_DELETE)
      if (denied) return denied
      const index = mockContacts.findIndex((item) => item.id === String(params.id))
      if (index === -1) return jsonError('Contacto no encontrado', 404)
      const removed = mockContacts[index]
      mockContacts.splice(index, 1)
      return jsonOk({ id: removed.id }, null, 'Contacto eliminado')
    }),
    http.get('*/api/v1/crm/opportunities', ({ request }) => {
      hydrateMockStore()
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const perPage = Number(url.searchParams.get('perPage') ?? 100)
      const clientId = url.searchParams.get('clientId')
      const stage = url.searchParams.get('stage') as OpportunityStage | null
      const ownerId = url.searchParams.get('ownerId')
      const search = (url.searchParams.get('search') ?? '').toLowerCase()
      const statusStages = stagesForStatus(url.searchParams.get('status'))
      let items = [...opportunities]
      if (clientId) items = items.filter((item) => item.clientId === clientId)
      if (stage) items = items.filter((item) => item.stage === stage)
      if (ownerId) items = items.filter((item) => item.ownerId === ownerId)
      if (statusStages) items = items.filter((item) => statusStages.includes(item.stage))
      if (search) {
        items = items.filter((item) =>
          item.title.toLowerCase().includes(search)
          || item.clientName.toLowerCase().includes(search)
          || (item.ownerName ?? '').toLowerCase().includes(search),
        )
      }
      const start = (page - 1) * perPage
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: items.slice(start, start + perPage),
        meta: { page, perPage, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / perPage)) },
      })
    }),
    http.get('*/api/v1/crm/opportunities/:id', ({ params }) => {
      hydrateMockStore()
      const item = opportunities.find((entry) => entry.id === params.id)
      if (!item) return jsonError('Oportunidad no encontrada', 404)
      return json(serializeOpportunity(item, true))
    }),
    http.post('*/api/v1/crm/opportunities', async ({ request }) => {
      const body = (await request.json()) as Partial<CrmOpportunity> & { title?: string; clientId?: string; amount?: number }
      if (!body.title?.trim()) return jsonError('El nombre es obligatorio y no puede contener solo espacios', 400)
      const client = mockClients.find((item) => item.id === body.clientId)
      if (!client) return jsonError('Cliente no encontrado', 404)
      const stage = (body.stage ?? 'NEW') as OpportunityStage
      const created: CrmOpportunity = {
        id: `o-${Date.now()}`,
        clientId: client.id,
        clientName: client.name,
        contactId: body.contactId ?? null,
        contactName: mockContacts.find((item) => item.id === body.contactId)
          ? `${mockContacts.find((item) => item.id === body.contactId)?.firstName} ${mockContacts.find((item) => item.id === body.contactId)?.lastName}`
          : null,
        ownerId: body.ownerId ?? '1',
        ownerName: 'Admin Sistema',
        title: body.title.trim(),
        amount: Number(body.amount ?? 0),
        currency: body.currency ?? 'MXN',
        probability: PROBABILITY_BY_STAGE[stage],
        stage,
        expectedCloseDate: body.expectedCloseDate ?? null,
        lostReason: null,
        notes: body.notes ?? '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      opportunities.unshift(created)
      persistMockStore()
      return json(created, 'Oportunidad creada', 201)
    }),
    http.put('*/api/v1/crm/opportunities/:id', async ({ params, request }) => {
      const item = opportunities.find((entry) => entry.id === params.id)
      if (!item) return jsonError('Oportunidad no encontrada', 404)
      const body = (await request.json()) as Partial<CrmOpportunity>
      if ((item.stage === 'WON' || item.stage === 'LOST') && body.stage && body.stage === item.stage) {
        if (body.title || body.amount !== undefined) {
          return jsonError('Reabre la oportunidad antes de editarla', 422)
        }
      }
      if (body.title) item.title = body.title.trim()
      if (body.amount !== undefined) item.amount = Number(body.amount)
      if (body.notes !== undefined) item.notes = body.notes
      if (body.clientId && body.clientId !== item.clientId) {
        const client = mockClients.find((entry) => entry.id === body.clientId)
        if (client) {
          item.clientId = client.id
          item.clientName = client.name
        }
      }
      item.updatedAt = nowIso()
      persistMockStore()
      return json(item, 'Oportunidad actualizada')
    }),
    http.patch('*/api/v1/crm/opportunities/:id/stage', async ({ params, request }) => {
      const denied = denyUnless(request, users, 'CRM_OPPORTUNITY_MOVE')
      if (denied) return denied
      const item = opportunities.find((entry) => entry.id === params.id)
      if (!item) return jsonError('Oportunidad no encontrada', 404)
      const body = (await request.json()) as {
        stage: OpportunityStage
        lostReason?: string
        reopen?: boolean
        reopenReason?: string
      }
      if (item.stage === body.stage) return jsonError('La oportunidad ya está en esa etapa', 422)
      if ((item.stage === 'WON' || item.stage === 'LOST') && !body.reopen) {
        return jsonError('Una oportunidad ganada o perdida sólo se reabre con una acción explícita', 422)
      }
      if (body.stage === 'LOST' && !body.lostReason?.trim()) {
        return jsonError('El motivo de pérdida es obligatorio', 400)
      }
      const previous = item.stage
      item.stage = body.stage
      item.probability = PROBABILITY_BY_STAGE[body.stage]
      item.lostReason = body.stage === 'LOST' ? body.lostReason!.trim() : body.stage === 'WON' ? null : item.lostReason
      item.updatedAt = nowIso()
      persistMockStore()
      if (previous === 'WON' || body.stage !== 'WON') {
        return json({
          ...item,
          surveyInvitation: body.stage === 'WON'
            ? {
                created: false,
                message: previous === 'WON'
                  ? 'Ya existe una invitación vigente para esta oportunidad.'
                  : undefined,
              }
            : null,
        }, 'Etapa actualizada')
      }
      const survey = surveys.find((entry) => entry.status === 'PUBLISHED' && entry.trigger === 'OPPORTUNITY_WON')
      if (!survey) {
        return json({
          ...item,
          surveyInvitation: {
            created: false,
            message: 'La oportunidad se marcó como ganada. No hay una encuesta activa para este disparador.',
          },
        }, 'Etapa actualizada')
      }
      const existing = invitations.find((entry) => entry.opportunityId === item.id && entry.surveyId === survey.id)
      if (existing) {
        return json({
          ...item,
          surveyInvitation: {
            created: false,
            surveyId: survey.id,
            surveyTitle: survey.title,
            message: existing.usedAt
              ? 'La encuesta ya fue respondida'
              : 'Ya existe una invitación vigente para esta oportunidad.',
          },
        }, 'Etapa actualizada')
      }
      const created = createOrRegenerate(item, survey, request, false)
      if (created.status !== 200) return created
      const payload = await created.json() as {
        data: { created: boolean; surveyId: string; surveyTitle: string; responseUrl: string; expiresAt: string }
      }
      return json({ ...item, surveyInvitation: payload.data }, 'Etapa actualizada')
    }),
    http.post('*/api/v1/crm/opportunities/:id/survey-invitation', async ({ params, request }) => {
      const denied = denyUnless(request, users, 'CRM_OPPORTUNITY_MOVE')
      if (denied) return denied
      const item = opportunities.find((entry) => entry.id === params.id)
      if (!item) return jsonError('Oportunidad no encontrada', 404)
      const body = (await request.json().catch(() => ({}))) as { surveyId?: string; confirmRegenerate?: boolean }
      let survey: CrmSurvey | undefined
      if (body.surveyId) {
        survey = surveys.find((entry) => entry.id === body.surveyId)
        if (!survey) return jsonError('Encuesta no encontrada', 404)
        if (survey.status !== 'PUBLISHED') return jsonError('La encuesta no está activa', 422)
        if (survey.trigger === 'OPPORTUNITY_WON' && item.stage !== 'WON') {
          return jsonError('La encuesta de oportunidad ganada sólo se genera cuando la oportunidad está ganada', 422)
        }
      } else {
        if (item.stage !== 'WON') return jsonError('Selecciona una encuesta manual activa', 422)
        survey = surveys.find((entry) => entry.status === 'PUBLISHED' && entry.trigger === 'OPPORTUNITY_WON')
        if (!survey) {
          return jsonError('La oportunidad se marcó como ganada. No hay una encuesta activa para este disparador.', 422)
        }
      }
      return createOrRegenerate(item, survey, request, Boolean(body.confirmRegenerate))
    }),
    http.post('*/api/v1/crm/opportunities/:id/survey-links/:surveyId', async ({ params, request }) => {
      const denied = denyUnless(request, users, 'CRM_OPPORTUNITY_MOVE')
      if (denied) return denied
      const item = opportunities.find((entry) => entry.id === params.id)
      if (!item) return jsonError('Oportunidad no encontrada', 404)
      const survey = surveys.find((entry) => entry.id === params.surveyId)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      return createOrRegenerate(item, survey, request, false)
    }),
    http.get('*/api/v1/crm/surveys', ({ request }) => {
      hydrateMockStore()
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const perPage = Number(url.searchParams.get('perPage') ?? 10)
      const status = url.searchParams.get('status') as SurveyStatus | null
      const search = (url.searchParams.get('search') ?? '').toLowerCase()
      let items = surveys.filter((survey) => !status || survey.status === status)
      if (search) {
        items = items.filter((survey) => survey.title.toLowerCase().includes(search))
      }
      const start = (page - 1) * perPage
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: items.slice(start, start + perPage).map(serialize),
        meta: { page, perPage, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / perPage)) },
      })
    }),
    http.post('*/api/v1/crm/surveys', async ({ request }) => {
      const body = (await request.json()) as { title?: string; description?: string; trigger?: SurveyTrigger }
      if (!body.title?.trim()) return jsonError('El título es obligatorio y no puede contener solo espacios', 400)
      const created: CrmSurvey = {
        id: `s-${Date.now()}`,
        title: body.title.trim(),
        description: body.description?.trim() ?? '',
        status: 'DRAFT',
        trigger: body.trigger ?? 'MANUAL',
        questionCount: 0,
        questions: [],
      }
      surveys.unshift(created)
      persistMockStore()
      return json(serialize(created), 'Encuesta creada', 201)
    }),
    http.get('*/api/v1/crm/surveys/:id/results', ({ params, request }) => {
      hydrateMockStore()
      const denied = denyUnless(request, users, 'CRM_SURVEY_RESULTS')
      if (denied) return denied
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      return json(buildResults(survey))
    }),
    http.get('*/api/v1/crm/surveys/:id', ({ params }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      return json(serialize(survey))
    }),
    http.put('*/api/v1/crm/surveys/:id/questions/order', async ({ params, request }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status !== 'DRAFT') return jsonError('Sólo se editan encuestas en borrador', 422)
      const body = (await request.json()) as { questionIds: string[] }
      const current = survey.questions ?? []
      if (body.questionIds.length !== current.length || current.some((question) => !body.questionIds.includes(question.id))) {
        return jsonError('El orden debe incluir todas las preguntas de la encuesta', 400)
      }
      survey.questions = body.questionIds.map((questionId, position) => {
        const question = current.find((item) => item.id === questionId)!
        return { ...question, position }
      })
      persistMockStore()
      return json(serialize(survey), 'Orden actualizado')
    }),
    http.put('*/api/v1/crm/surveys/:id', async ({ params, request }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status !== 'DRAFT') return jsonError('Sólo se editan encuestas en borrador', 422)
      const body = (await request.json()) as { title?: string; description?: string; trigger?: SurveyTrigger }
      if (body.title) survey.title = body.title.trim()
      if (body.description !== undefined) survey.description = body.description.trim()
      if (body.trigger) survey.trigger = body.trigger
      persistMockStore()
      return json(serialize(survey), 'Encuesta actualizada')
    }),
    http.post('*/api/v1/crm/surveys/:id/publish', ({ params }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status === 'PUBLISHED') return jsonError('La encuesta ya está activa', 422)
      if (!(survey.questions?.length)) return jsonError('Agrega al menos una pregunta para publicar', 422)
      if (survey.trigger !== 'MANUAL') {
        const existing = surveys.find(
          (item) => item.status === 'PUBLISHED' && item.trigger === survey.trigger && item.id !== survey.id,
        )
        if (existing) {
          return jsonError('Ya existe una encuesta activa para el disparador Oportunidad ganada. Desactívala antes de activar otra.', 409)
        }
      }
      survey.status = 'PUBLISHED'
      persistMockStore()
      return json(serialize(survey), 'Encuesta activada')
    }),
    http.post('*/api/v1/crm/surveys/:id/close', ({ params }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status !== 'PUBLISHED') return jsonError('Sólo se desactivan encuestas publicadas', 422)
      survey.status = 'CLOSED'
      persistMockStore()
      return json(serialize(survey), 'Encuesta desactivada')
    }),
    http.post('*/api/v1/crm/surveys/:id/questions', async ({ params, request }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status !== 'DRAFT') return jsonError('Sólo se editan encuestas en borrador', 422)
      const body = (await request.json()) as {
        prompt: string
        type: SurveyQuestionType
        required?: boolean
        options?: Array<{ label: string; value?: string }>
      }
      if (!body.prompt?.trim()) return jsonError('La pregunta es obligatoria y no puede contener solo espacios', 400)
      let options = body.options ?? []
      if (body.type === 'YES_NO' && options.length < 2) {
        options = [{ label: 'Sí', value: 'yes' }, { label: 'No', value: 'no' }]
      }
      if ((body.type === 'SINGLE_CHOICE' || body.type === 'MULTIPLE_CHOICE') && options.length < 2) {
        return jsonError('Las preguntas de opción requieren al menos dos alternativas', 400)
      }
      const question: CrmSurveyQuestion = {
        id: `q-${Date.now()}`,
        prompt: body.prompt.trim(),
        type: body.type,
        required: body.required ?? true,
        position: survey.questions?.length ?? 0,
        options: options.map((option, index) => ({
          id: `opt-${Date.now()}-${index}`,
          label: option.label,
          value: option.value || option.label,
        })),
      }
      survey.questions = [...(survey.questions ?? []), question]
      survey.questionCount = survey.questions.length
      persistMockStore()
      return json(serialize(survey), 'Pregunta agregada')
    }),
    http.delete('*/api/v1/crm/surveys/:id/questions/:questionId', ({ params }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status !== 'DRAFT') return jsonError('Sólo se editan encuestas en borrador', 422)
      survey.questions = (survey.questions ?? []).filter((question) => question.id !== params.questionId)
      survey.questionCount = survey.questions.length
      persistMockStore()
      return json(serialize(survey), 'Pregunta eliminada')
    }),
    http.get('*/api/v1/public/surveys/:token', ({ params }) => {
      hydrateMockStore()
      const invitation = invitations.find((item) => item.token === params.token)
      if (!invitation) return jsonError('Enlace de encuesta inválido', 404)
      if (invitation.usedAt) return jsonError('La encuesta ya fue respondida', 409)
      if (invitation.revokedAt) return jsonError('El enlace de encuesta ya no está disponible', 410)
      if (new Date(invitation.expiresAt).getTime() < Date.now()) return jsonError('El enlace de encuesta expiró', 410)
      const survey = surveys.find((item) => item.id === invitation.surveyId)
      if (!survey || survey.status !== 'PUBLISHED') return jsonError('La encuesta ya no está disponible', 410)
      return json({
        surveyId: survey.id,
        title: survey.title,
        description: survey.description,
        questions: serialize(survey).questions,
      })
    }),
    http.post('*/api/v1/public/surveys/:token/respond', async ({ params, request }) => {
      hydrateMockStore()
      const invitation = invitations.find((item) => item.token === params.token)
      if (!invitation) return jsonError('Enlace de encuesta inválido', 404)
      if (invitation.usedAt) return jsonError('La encuesta ya fue respondida', 409)
      if (invitation.revokedAt) return jsonError('El enlace de encuesta ya no está disponible', 410)
      if (new Date(invitation.expiresAt).getTime() < Date.now()) return jsonError('El enlace de encuesta expiró', 410)
      const survey = surveys.find((item) => item.id === invitation.surveyId)
      if (!survey || survey.status !== 'PUBLISHED') return jsonError('La encuesta ya no está disponible', 410)
      const body = (await request.json()) as { answers: StoredAnswer[] }
      const byId = new Map((body.answers ?? []).map((answer) => [answer.questionId, answer]))
      for (const question of survey.questions ?? []) {
        const answer = byId.get(question.id)
        const empty = !answer?.textValue?.trim() && answer?.numberValue === undefined && !(answer?.optionIds?.length)
        if (question.required && empty) return jsonError(`Falta responder: ${question.prompt}`, 400)
        if (answer?.optionIds?.length) {
          const valid = new Set(question.options.map((option) => option.id))
          if (answer.optionIds.some((optionId) => !valid.has(optionId))) {
            return jsonError('La opción no pertenece a la pregunta', 400)
          }
        }
      }
      invitation.usedAt = nowIso()
      const nps = (survey.questions ?? []).find((question) => question.type === 'NPS')
      const opportunity = invitation.opportunityId
        ? opportunities.find((item) => item.id === invitation.opportunityId)
        : undefined
      const client = invitation.clientId
        ? mockClients.find((item) => item.id === invitation.clientId)
        : undefined
      responses.push({
        id: `r-${Date.now()}`,
        surveyId: survey.id,
        npsScore: nps ? byId.get(nps.id)?.numberValue ?? null : null,
        answers: body.answers ?? [],
        opportunityId: opportunity?.id ?? null,
        opportunityTitle: opportunity?.title ?? null,
        clientId: client?.id ?? invitation.clientId,
        clientName: client?.name ?? null,
        trigger: invitation.trigger,
        invitedAt: invitation.createdAt,
        submittedAt: invitation.usedAt,
      })
      persistMockStore()
      return json({ submitted: true }, 'Respuesta registrada')
    }),
  ]
}
