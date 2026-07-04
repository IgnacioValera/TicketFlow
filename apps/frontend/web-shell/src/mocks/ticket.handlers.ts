import { http, HttpResponse } from 'msw'
import { calculateSlaStatus, matchesSlaFilter } from '@/utils/sla.utils'
import type { User } from '@/types/user.types'
import type {
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketStatus,
  TicketStatusHistory,
  TicketSurvey,
} from '@/types/ticket.types'

interface TicketStore {
  ticket: Ticket
  comments: TicketComment[]
  attachments: TicketAttachment[]
  statusHistory: TicketStatusHistory[]
  survey: TicketSurvey | null
}

let folioCounter = 6

const mockCategories = [
  { id: '1', name: 'Hardware' },
  { id: '2', name: 'Software' },
  { id: '3', name: 'Accesos' },
]

const mockPriorities = [
  { id: '1', name: 'Baja', color: '#94a3b8', resolutionHours: 72 },
  { id: '2', name: 'Media', color: '#247b7b', resolutionHours: 48 },
  { id: '3', name: 'Alta', color: '#f97316', resolutionHours: 24 },
  { id: '4', name: 'Critica', color: '#db3a34', resolutionHours: 8 },
]

const mockCompanies = [
  { id: '1', name: 'Acme Corp' },
  { id: '2', name: 'Globex' },
]

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600000).toISOString()
}

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 3600000).toISOString()
}

function buildTicket(partial: Partial<Ticket> & Pick<Ticket, 'id' | 'folio' | 'title' | 'description' | 'status' | 'requesterId' | 'requesterName' | 'categoryId' | 'priorityId'>): Ticket {
  const cat = mockCategories.find((c) => c.id === partial.categoryId)!
  const pri = mockPriorities.find((p) => p.id === partial.priorityId)!
  const createdAt = partial.createdAt ?? hoursAgo(10)
  const resolutionHours = partial.resolutionHours ?? pri.resolutionHours
  const slaDueAt = partial.slaDueAt ?? new Date(new Date(createdAt).getTime() + resolutionHours * 3600000).toISOString()
  return {
    categoryName: cat.name,
    priorityName: pri.name,
    priorityColor: pri.color,
    assigneeId: null,
    assigneeName: null,
    companyId: null,
    companyName: null,
    slaDueAt,
    slaCreatedAt: createdAt,
    resolutionHours,
    closedAt: null,
    createdAt,
    ...partial,
  }
}

const ticketStores: TicketStore[] = [
  {
    ticket: buildTicket({
      id: 't1',
      folio: 'HD-2026-0001',
      title: 'No puedo acceder al sistema de nomina',
      description: 'Credenciales invalidas tras restablecer contrasena.',
      status: 'OPEN',
      requesterId: '4',
      requesterName: 'Usuario Solicitante',
      categoryId: '2',
      priorityId: '3',
      createdAt: hoursAgo(2),
      slaDueAt: hoursFromNow(22),
    }),
    comments: [],
    attachments: [],
    statusHistory: [
      {
        id: 'h1',
        ticketId: 't1',
        oldStatus: null,
        newStatus: 'OPEN',
        changedBy: '4',
        changedByName: 'Usuario Solicitante',
        createdAt: hoursAgo(2),
      },
    ],
    survey: null,
  },
  {
    ticket: buildTicket({
      id: 't2',
      folio: 'HD-2026-0002',
      title: 'Impresora no responde',
      description: 'La impresora del piso 3 no imprime documentos.',
      status: 'ASSIGNED',
      requesterId: '4',
      requesterName: 'Usuario Solicitante',
      categoryId: '1',
      priorityId: '2',
      assigneeId: '2',
      assigneeName: 'Agente Soporte',
      createdAt: hoursAgo(20),
      slaDueAt: hoursFromNow(28),
    }),
    comments: [
      {
        id: 'c1',
        ticketId: 't2',
        userId: '2',
        authorName: 'Agente Soporte',
        body: 'Revisare el equipo esta tarde.',
        isInternal: false,
        createdAt: hoursAgo(18),
      },
    ],
    attachments: [],
    statusHistory: [
      { id: 'h2', ticketId: 't2', oldStatus: null, newStatus: 'OPEN', changedBy: '4', changedByName: 'Usuario Solicitante', createdAt: hoursAgo(20) },
      { id: 'h3', ticketId: 't2', oldStatus: 'OPEN', newStatus: 'ASSIGNED', changedBy: '3', changedByName: 'Supervisor Mesa', createdAt: hoursAgo(19) },
    ],
    survey: null,
  },
  {
    ticket: buildTicket({
      id: 't3',
      folio: 'HD-2026-0003',
      title: 'Error en modulo de reportes',
      description: 'El dashboard muestra error 500 al exportar.',
      status: 'IN_PROGRESS',
      requesterId: '4',
      requesterName: 'Usuario Solicitante',
      categoryId: '2',
      priorityId: '4',
      assigneeId: '2',
      assigneeName: 'Agente Soporte',
      companyId: '1',
      companyName: 'Acme Corp',
      createdAt: hoursAgo(6),
      slaDueAt: hoursFromNow(1),
    }),
    comments: [],
    attachments: [],
    statusHistory: [
      { id: 'h4', ticketId: 't3', oldStatus: null, newStatus: 'OPEN', changedBy: '4', changedByName: 'Usuario Solicitante', createdAt: hoursAgo(6) },
      { id: 'h5', ticketId: 't3', oldStatus: 'OPEN', newStatus: 'ASSIGNED', changedBy: '3', changedByName: 'Supervisor Mesa', createdAt: hoursAgo(5) },
      { id: 'h6', ticketId: 't3', oldStatus: 'ASSIGNED', newStatus: 'IN_PROGRESS', changedBy: '2', changedByName: 'Agente Soporte', createdAt: hoursAgo(4) },
    ],
    survey: null,
  },
  {
    ticket: buildTicket({
      id: 't4',
      folio: 'HD-2026-0004',
      title: 'Solicitud de acceso VPN',
      description: 'Nuevo colaborador requiere acceso VPN.',
      status: 'RESOLVED',
      requesterId: '4',
      requesterName: 'Usuario Solicitante',
      categoryId: '3',
      priorityId: '2',
      assigneeId: '2',
      assigneeName: 'Agente Soporte',
      createdAt: hoursAgo(48),
      slaDueAt: hoursFromNow(0),
    }),
    comments: [
      { id: 'c2', ticketId: 't4', userId: '2', authorName: 'Agente Soporte', body: 'Acceso configurado correctamente.', isInternal: false, createdAt: hoursAgo(24) },
    ],
    attachments: [],
    statusHistory: [
      { id: 'h7', ticketId: 't4', oldStatus: null, newStatus: 'OPEN', changedBy: '4', changedByName: 'Usuario Solicitante', createdAt: hoursAgo(48) },
      { id: 'h8', ticketId: 't4', oldStatus: 'OPEN', newStatus: 'ASSIGNED', changedBy: '3', changedByName: 'Supervisor Mesa', createdAt: hoursAgo(47) },
      { id: 'h9', ticketId: 't4', oldStatus: 'ASSIGNED', newStatus: 'IN_PROGRESS', changedBy: '2', changedByName: 'Agente Soporte', createdAt: hoursAgo(46) },
      { id: 'h10', ticketId: 't4', oldStatus: 'IN_PROGRESS', newStatus: 'RESOLVED', changedBy: '2', changedByName: 'Agente Soporte', createdAt: hoursAgo(24) },
    ],
    survey: null,
  },
  {
    ticket: buildTicket({
      id: 't5',
      folio: 'HD-2026-0005',
      title: 'Servidor de archivos caido',
      description: 'No hay acceso al share corporativo.',
      status: 'ESCALATED',
      requesterId: '4',
      requesterName: 'Usuario Solicitante',
      categoryId: '1',
      priorityId: '4',
      assigneeId: '2',
      assigneeName: 'Agente Soporte',
      createdAt: hoursAgo(10),
      slaDueAt: hoursAgo(1),
    }),
    comments: [],
    attachments: [],
    statusHistory: [
      { id: 'h11', ticketId: 't5', oldStatus: null, newStatus: 'OPEN', changedBy: '4', changedByName: 'Usuario Solicitante', createdAt: hoursAgo(10) },
      { id: 'h12', ticketId: 't5', oldStatus: 'IN_PROGRESS', newStatus: 'ESCALATED', changedBy: '2', changedByName: 'Agente Soporte', reason: 'Requiere infraestructura', createdAt: hoursAgo(3) },
    ],
    survey: null,
  },
]

function findUserFromRequest(request: Request, mockUsers: User[]): User | undefined {
  const auth = request.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return undefined
  const token = auth.replace('Bearer ', '')
  if (token === 'mock-token-refreshed') return mockUsers[0]
  const userId = token.replace('mock-token-', '')
  return mockUsers.find((u) => u.id === userId)
}

function paginate<T>(items: T[], page = 1, perPage = 10) {
  const start = (page - 1) * perPage
  const data = items.slice(start, start + perPage)
  return {
    data,
    meta: { page, perPage, total: items.length, totalPages: Math.ceil(items.length / perPage) || 1 },
  }
}

function enrichTicket(store: TicketStore): Ticket {
  return {
    ...store.ticket,
    statusHistory: store.statusHistory,
    comments: store.comments,
    attachments: store.attachments,
    survey: store.survey,
  }
}

function filterByRole(stores: TicketStore[], user: User): TicketStore[] {
  if (user.role === 'REQUESTER') {
    return stores.filter((s) => s.ticket.requesterId === user.id)
  }
  if (user.role === 'AGENT') {
    return stores.filter((s) => s.ticket.assigneeId === user.id)
  }
  return stores
}

function addHistory(store: TicketStore, oldStatus: TicketStatus | null, newStatus: TicketStatus, user: User, reason?: string) {
  store.statusHistory.push({
    id: `h-${Date.now()}`,
    ticketId: store.ticket.id,
    oldStatus,
    newStatus,
    changedBy: user.id,
    changedByName: user.fullName,
    reason,
    createdAt: new Date().toISOString(),
  })
}

export function createTicketHandlers(mockUsers: User[]) {
  return [
    http.get('*/api/v1/tickets', async ({ request }) => {
      const user = findUserFromRequest(request, mockUsers)
      if (!user) return HttpResponse.json({ success: false, message: 'No autenticado', data: null, meta: null }, { status: 401 })

      const url = new URL(request.url)
      let filtered = filterByRole([...ticketStores], user)

      const status = url.searchParams.get('status') as TicketStatus | null
      const priorityId = url.searchParams.get('priorityId')
      const categoryId = url.searchParams.get('categoryId')
      const assigneeId = url.searchParams.get('assigneeId')
      const search = url.searchParams.get('search')
      const unassigned = url.searchParams.get('unassigned') === 'true'
      const slaStatus = (url.searchParams.get('sla_status') ?? url.searchParams.get('slaStatus')) as 'overdue' | 'warning' | 'on_time' | null

      if (status) filtered = filtered.filter((s) => s.ticket.status === status)
      if (priorityId) filtered = filtered.filter((s) => s.ticket.priorityId === priorityId)
      if (categoryId) filtered = filtered.filter((s) => s.ticket.categoryId === categoryId)
      if (assigneeId) filtered = filtered.filter((s) => s.ticket.assigneeId === assigneeId)
      if (unassigned) filtered = filtered.filter((s) => !s.ticket.assigneeId && s.ticket.status === 'OPEN')
      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(
          (s) => s.ticket.title.toLowerCase().includes(q) || s.ticket.folio.toLowerCase().includes(q),
        )
      }
      if (slaStatus) {
        filtered = filtered.filter((s) => {
          const sla = calculateSlaStatus(s.ticket.slaCreatedAt, s.ticket.slaDueAt, s.ticket.resolutionHours)
          return matchesSlaFilter(sla, slaStatus)
        })
      }

      const page = Number(url.searchParams.get('page')) || 1
      const perPage = Number(url.searchParams.get('perPage')) || 10
      const result = paginate(
        filtered.map((s) => s.ticket),
        page,
        perPage,
      )
      return HttpResponse.json({ success: true, message: 'OK', data: result.data, meta: result.meta })
    }),

    http.post('*/api/v1/tickets', async ({ request }) => {
      const user = findUserFromRequest(request, mockUsers)
      if (!user) return HttpResponse.json({ success: false, message: 'No autenticado', data: null, meta: null }, { status: 401 })

      const body = (await request.json()) as {
        title: string
        description: string
        categoryId: string
        priorityId: string
        companyId?: string
      }
      if (!body.title || !body.description || !body.categoryId || !body.priorityId) {
        return HttpResponse.json({ success: false, message: 'Campos obligatorios faltantes', data: null, meta: null }, { status: 422 })
      }

      folioCounter += 1
      const id = `t${Date.now()}`
      const pri = mockPriorities.find((p) => p.id === body.priorityId)!
      const company = body.companyId ? mockCompanies.find((c) => c.id === body.companyId) : null
      const createdAt = new Date().toISOString()
      const slaDueAt = new Date(Date.now() + pri.resolutionHours * 3600000).toISOString()

      const ticket = buildTicket({
        id,
        folio: `HD-2026-${String(folioCounter).padStart(4, '0')}`,
        title: body.title,
        description: body.description,
        status: 'OPEN',
        requesterId: user.id,
        requesterName: user.fullName,
        categoryId: body.categoryId,
        priorityId: body.priorityId,
        companyId: company?.id ?? null,
        companyName: company?.name ?? null,
        createdAt,
        slaDueAt,
        slaCreatedAt: createdAt,
        resolutionHours: pri.resolutionHours,
      })

      const store: TicketStore = {
        ticket,
        comments: [],
        attachments: [],
        statusHistory: [{
          id: `h-${id}`,
          ticketId: id,
          oldStatus: null,
          newStatus: 'OPEN',
          changedBy: user.id,
          changedByName: user.fullName,
          createdAt,
        }],
        survey: null,
      }
      ticketStores.unshift(store)
      return HttpResponse.json({ success: true, message: 'Ticket creado', data: ticket, meta: null }, { status: 201 })
    }),

    http.get('*/api/v1/tickets/:id', async ({ params, request }) => {
      const user = findUserFromRequest(request, mockUsers)
      if (!user) return HttpResponse.json({ success: false, message: 'No autenticado', data: null, meta: null }, { status: 401 })
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })

      const allowed = filterByRole([store], user)
      if (allowed.length === 0 && user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
        return HttpResponse.json({ success: false, message: 'Sin permiso', data: null, meta: null }, { status: 403 })
      }
      return HttpResponse.json({ success: true, message: 'OK', data: enrichTicket(store), meta: null })
    }),

    http.put('*/api/v1/tickets/:id', async ({ params, request }) => {
      const user = findUserFromRequest(request, mockUsers)
      if (!user) return HttpResponse.json({ success: false, message: 'No autenticado', data: null, meta: null }, { status: 401 })
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })

      const body = (await request.json()) as { title?: string; description?: string; categoryId?: string; priorityId?: string }
      if (body.categoryId) {
        const cat = mockCategories.find((c) => c.id === body.categoryId)
        if (cat) { store.ticket.categoryId = cat.id; store.ticket.categoryName = cat.name }
      }
      if (body.priorityId) {
        const pri = mockPriorities.find((p) => p.id === body.priorityId)
        if (pri) {
          store.ticket.priorityId = pri.id
          store.ticket.priorityName = pri.name
          store.ticket.priorityColor = pri.color
          store.ticket.resolutionHours = pri.resolutionHours
          store.ticket.slaDueAt = new Date(new Date(store.ticket.slaCreatedAt).getTime() + pri.resolutionHours * 3600000).toISOString()
        }
      }
      if (body.title) store.ticket.title = body.title
      if (body.description) store.ticket.description = body.description
      return HttpResponse.json({ success: true, message: 'Ticket actualizado', data: enrichTicket(store), meta: null })
    }),

    http.patch('*/api/v1/tickets/:id/status', async ({ params, request }) => {
      const user = findUserFromRequest(request, mockUsers)
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      const body = (await request.json()) as { status: TicketStatus; reason?: string }
      const old = store.ticket.status
      store.ticket.status = body.status
      if (body.status === 'ASSIGNED' && !store.ticket.assigneeId) {
        /* keep */
      }
      addHistory(store, old, body.status, user!, body.reason)
      return HttpResponse.json({ success: true, message: 'Estado actualizado', data: enrichTicket(store), meta: null })
    }),

    http.patch('*/api/v1/tickets/:id/assign', async ({ params, request }) => {
      const user = findUserFromRequest(request, mockUsers)
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      const body = (await request.json()) as { assigneeId: string }
      const agent = mockUsers.find((u) => u.id === body.assigneeId && u.role === 'AGENT')
      if (!agent) return HttpResponse.json({ success: false, message: 'Agente invalido', data: null, meta: null }, { status: 422 })
      const old = store.ticket.status
      store.ticket.assigneeId = agent.id
      store.ticket.assigneeName = agent.fullName
      if (store.ticket.status === 'OPEN') {
        store.ticket.status = 'ASSIGNED'
        addHistory(store, old, 'ASSIGNED', user!, 'Asignado a agente')
      }
      return HttpResponse.json({ success: true, message: 'Ticket asignado', data: enrichTicket(store), meta: null })
    }),

    http.patch('*/api/v1/tickets/:id/escalate', async ({ params, request }) => {
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      const user = findUserFromRequest(request, mockUsers)!
      const body = (await request.json()) as { reason: string }
      const old = store.ticket.status
      store.ticket.status = 'ESCALATED'
      addHistory(store, old, 'ESCALATED', user, body.reason)
      return HttpResponse.json({ success: true, message: 'Ticket escalado', data: enrichTicket(store), meta: null })
    }),

    http.patch('*/api/v1/tickets/:id/close', async ({ params, request }) => {
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      const user = findUserFromRequest(request, mockUsers)!
      const old = store.ticket.status
      store.ticket.status = 'CLOSED'
      store.ticket.closedAt = new Date().toISOString()
      addHistory(store, old, 'CLOSED', user)
      return HttpResponse.json({ success: true, message: 'Ticket cerrado', data: enrichTicket(store), meta: null })
    }),

    http.get('*/api/v1/tickets/:id/comments', async ({ params, request }) => {
      const user = findUserFromRequest(request, mockUsers)
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      let comments = store.comments
      if (user?.role === 'REQUESTER') comments = comments.filter((c) => !c.isInternal)
      return HttpResponse.json({ success: true, message: 'OK', data: comments, meta: null })
    }),

    http.post('*/api/v1/tickets/:id/comments', async ({ params, request }) => {
      const user = findUserFromRequest(request, mockUsers)!
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      const body = (await request.json()) as { body: string; isInternal?: boolean }
      const isInternal = user.role === 'REQUESTER' ? false : Boolean(body.isInternal)
      const comment: TicketComment = {
        id: `c-${Date.now()}`,
        ticketId: store.ticket.id,
        userId: user.id,
        authorName: user.fullName,
        body: body.body,
        isInternal,
        createdAt: new Date().toISOString(),
      }
      store.comments.push(comment)
      return HttpResponse.json({ success: true, message: 'Comentario agregado', data: comment, meta: null }, { status: 201 })
    }),

    http.get('*/api/v1/tickets/:id/attachments', async ({ params }) => {
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      return HttpResponse.json({ success: true, message: 'OK', data: store.attachments, meta: null })
    }),

    http.post('*/api/v1/tickets/:id/attachments', async ({ params, request }) => {
      const user = findUserFromRequest(request, mockUsers)!
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return HttpResponse.json({ success: false, message: 'Archivo requerido', data: null, meta: null }, { status: 422 })
      const attachment: TicketAttachment = {
        id: `a-${Date.now()}`,
        ticketId: store.ticket.id,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        fileUrl: '#',
        uploadedBy: user.id,
        uploadedByName: user.fullName,
        createdAt: new Date().toISOString(),
      }
      store.attachments.push(attachment)
      return HttpResponse.json({ success: true, message: 'Adjunto subido', data: attachment, meta: null }, { status: 201 })
    }),

    http.delete('*/api/v1/attachments/:id', async ({ params, request }) => {
      const user = findUserFromRequest(request, mockUsers)!
      for (const store of ticketStores) {
        const idx = store.attachments.findIndex((a) => a.id === params.id)
        if (idx >= 0) {
          const att = store.attachments[idx]
          if (att.uploadedBy !== user.id && user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
            return HttpResponse.json({ success: false, message: 'Sin permiso', data: null, meta: null }, { status: 403 })
          }
          store.attachments.splice(idx, 1)
          return HttpResponse.json({ success: true, message: 'Adjunto eliminado', data: null, meta: null })
        }
      }
      return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
    }),

    http.get('*/api/v1/tickets/:id/sla', async ({ params }) => {
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      const sla = calculateSlaStatus(store.ticket.slaCreatedAt, store.ticket.slaDueAt, store.ticket.resolutionHours)
      return HttpResponse.json({ success: true, message: 'OK', data: sla, meta: null })
    }),

    http.post('*/api/v1/tickets/:id/survey', async ({ params, request }) => {
      findUserFromRequest(request, mockUsers)
      const store = ticketStores.find((s) => s.ticket.id === params.id)
      if (!store) return HttpResponse.json({ success: false, message: 'No encontrado', data: null, meta: null }, { status: 404 })
      const body = (await request.json()) as { rating: number; comment?: string }
      const survey: TicketSurvey = {
        id: `s-${Date.now()}`,
        ticketId: store.ticket.id,
        rating: body.rating,
        comment: body.comment,
        submittedAt: new Date().toISOString(),
      }
      store.survey = survey
      store.ticket.survey = survey
      return HttpResponse.json({ success: true, message: 'Encuesta registrada', data: survey, meta: null }, { status: 201 })
    }),
  ]
}
