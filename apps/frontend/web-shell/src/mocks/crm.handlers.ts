import { http, HttpResponse } from 'msw'
import type {
  CrmClient,
  CrmDashboard,
  CrmSurvey,
  CrmSurveyQuestion,
  SurveyQuestionType,
  SurveyResults,
  SurveyStatus,
  SurveyTrigger,
} from '@/types/crm.types'
import { calculateNps } from '@/utils/nps'
import { optionBreakdown, ratingBreakdown } from '@/utils/survey-form'

const mockClients: CrmClient[] = [
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
    status: 'ACTIVE',
    score: 61,
    ownerId: null,
    ownerName: null,
    createdAt: '2025-06-10T00:00:00.000Z',
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

const invitations = [
  { token: 'demo-active-token', surveyId: 's-empty', usedAt: null as string | null, expiresAt: '2099-01-01T00:00:00.000Z' },
  { token: 'demo-used-token', surveyId: 's-nps', usedAt: '2026-08-01T00:00:00.000Z', expiresAt: '2099-01-01T00:00:00.000Z' },
  { token: 'demo-closed-token', surveyId: 's-closed', usedAt: null as string | null, expiresAt: '2099-01-01T00:00:00.000Z' },
]

type StoredAnswer = { questionId: string; textValue?: string | null; numberValue?: number | null; optionIds?: string[] | null }

const responses: Array<{ id: string; surveyId: string; npsScore: number | null; answers: StoredAnswer[] }> = [
  { id: 'r1', surveyId: 's-nps', npsScore: 9, answers: [{ questionId: 'q-nps', numberValue: 9 }, { questionId: 'q-yesno', optionIds: ['opt-yes'] }] },
  { id: 'r2', surveyId: 's-nps', npsScore: 10, answers: [{ questionId: 'q-nps', numberValue: 10 }, { questionId: 'q-yesno', optionIds: ['opt-yes'] }] },
  { id: 'r3', surveyId: 's-nps', npsScore: 6, answers: [{ questionId: 'q-nps', numberValue: 6 }, { questionId: 'q-yesno', optionIds: ['opt-no'] }] },
]

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

export function createCrmHandlers() {
  return [
    http.get('*/api/v1/crm/dashboard', () =>
      HttpResponse.json({ success: true, message: 'OK', data: mockDashboard, meta: null }),
    ),
    http.get('*/api/v1/crm/clients', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const perPage = Number(url.searchParams.get('perPage') ?? 10)
      const status = url.searchParams.get('status')
      const items = status ? mockClients.filter((client) => client.status === status) : mockClients
      const start = (page - 1) * perPage
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: items.slice(start, start + perPage),
        meta: { page, perPage, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / perPage)) },
      })
    }),
    http.get('*/api/v1/crm/clients/:id', ({ params }) => {
      const client = mockClients.find((item) => item.id === params.id)
      if (!client) {
        return HttpResponse.json({ success: false, message: 'Cliente no encontrado', data: null, meta: null }, { status: 404 })
      }
      return HttpResponse.json({ success: true, message: 'OK', data: client, meta: null })
    }),
    http.get('*/api/v1/crm/surveys', ({ request }) => {
      const url = new URL(request.url)
      const status = url.searchParams.get('status') as SurveyStatus | null
      const items = surveys.filter((survey) => !status || survey.status === status).map(serialize)
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: items,
        meta: { page: 1, perPage: 50, total: items.length, totalPages: 1 },
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
      return json(serialize(created), 'Encuesta creada', 201)
    }),
    http.get('*/api/v1/crm/surveys/:id/results', ({ params }) => {
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
      return json(serialize(survey), 'Encuesta actualizada')
    }),
    http.post('*/api/v1/crm/surveys/:id/publish', ({ params }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status === 'PUBLISHED') return jsonError('La encuesta ya está activa', 422)
      if (!(survey.questions?.length)) return jsonError('Agrega al menos una pregunta para publicar', 422)
      survey.status = 'PUBLISHED'
      return json(serialize(survey), 'Encuesta activada')
    }),
    http.post('*/api/v1/crm/surveys/:id/close', ({ params }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status !== 'PUBLISHED') return jsonError('Sólo se desactivan encuestas publicadas', 422)
      survey.status = 'CLOSED'
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
      return json(serialize(survey), 'Pregunta agregada')
    }),
    http.delete('*/api/v1/crm/surveys/:id/questions/:questionId', ({ params }) => {
      const survey = surveys.find((item) => item.id === params.id)
      if (!survey) return jsonError('Encuesta no encontrada', 404)
      if (survey.status !== 'DRAFT') return jsonError('Sólo se editan encuestas en borrador', 422)
      survey.questions = (survey.questions ?? []).filter((question) => question.id !== params.questionId)
      survey.questionCount = survey.questions.length
      return json(serialize(survey), 'Pregunta eliminada')
    }),
    http.get('*/api/v1/public/surveys/:token', ({ params }) => {
      const invitation = invitations.find((item) => item.token === params.token)
      if (!invitation) return jsonError('Enlace de encuesta inválido', 404)
      if (invitation.usedAt) return jsonError('La encuesta ya fue respondida', 409)
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
      const invitation = invitations.find((item) => item.token === params.token)
      if (!invitation) return jsonError('Enlace de encuesta inválido', 404)
      if (invitation.usedAt) return jsonError('La encuesta ya fue respondida', 409)
      const survey = surveys.find((item) => item.id === invitation.surveyId)
      if (!survey || survey.status !== 'PUBLISHED') return jsonError('La encuesta ya no está disponible', 410)
      const body = (await request.json()) as { answers: StoredAnswer[] }
      const byId = new Map((body.answers ?? []).map((answer) => [answer.questionId, answer]))
      for (const question of survey.questions ?? []) {
        const answer = byId.get(question.id)
        const empty = !answer?.textValue?.trim() && answer?.numberValue === undefined && !(answer?.optionIds?.length)
        if (question.required && empty) return jsonError(`Falta responder: ${question.prompt}`, 400)
      }
      invitation.usedAt = nowIso()
      const nps = (survey.questions ?? []).find((question) => question.type === 'NPS')
      responses.push({
        id: `r-${Date.now()}`,
        surveyId: survey.id,
        npsScore: nps ? byId.get(nps.id)?.numberValue ?? null : null,
        answers: body.answers ?? [],
      })
      return json({ submitted: true }, 'Respuesta registrada')
    }),
  ]
}
