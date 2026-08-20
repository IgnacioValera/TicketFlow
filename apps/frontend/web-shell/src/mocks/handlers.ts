import { http, HttpResponse } from 'msw'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import type { Category, Company, Priority, SlaPolicy } from '@/types/catalog.types'
import type { User, UserRole, UserStatus } from '@/types/user.types'
import { createCrmHandlers } from '@/mocks/crm.handlers'
import { createTicketHandlers } from '@/mocks/ticket.handlers'
import { createAccessHandlers } from '@/mocks/access.handlers'
import {
  listNotifications,
  markAllRead,
  markNotificationRead,
  unreadCount,
} from '@/mocks/notifications-store'
import { mockKnowledgeArticles, findMockKnowledgeArticle, findMockKnowledgeArticleIncludingInactive, isKnowledgeUuid } from '@/mocks/knowledge-data'
import { validatePasswordPolicy } from '@/utils/validation'

const mockPasswords: Record<string, string> = {
  '1': 'password',
  '2': 'password',
  '3': 'password',
  '4': 'password',
  '5': 'password',
}

const mockUsers: User[] = [
  {
    id: '1',
    fullName: 'Admin Sistema',
    email: 'admin@helpdesk.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    permissions: ROLE_PERMISSIONS.ADMIN,
    mustChangePassword: false,
    lastLoginAt: '2026-08-17T15:10:00.000Z',
    createdAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: '2',
    fullName: 'Agente Soporte',
    email: 'agent@helpdesk.com',
    role: 'AGENT',
    status: 'ACTIVE',
    permissions: ROLE_PERMISSIONS.AGENT,
    mustChangePassword: false,
    lastLoginAt: '2026-08-17T12:30:00.000Z',
    createdAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: '3',
    fullName: 'Supervisor Mesa',
    email: 'supervisor@helpdesk.com',
    role: 'SUPERVISOR',
    status: 'ACTIVE',
    permissions: ROLE_PERMISSIONS.SUPERVISOR,
    mustChangePassword: false,
    lastLoginAt: '2026-08-16T18:45:00.000Z',
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: '4',
    fullName: 'Usuario Solicitante',
    email: 'requester@helpdesk.com',
    role: 'REQUESTER',
    status: 'ACTIVE',
    clientId: 'c1',
    clientName: 'Acme Corp',
    permissions: ROLE_PERMISSIONS.REQUESTER,
    mustChangePassword: false,
    lastLoginAt: '2026-08-18T08:00:00.000Z',
    createdAt: '2026-03-20T09:00:00.000Z',
  },
  {
    id: '5',
    fullName: 'Usuario Inactivo',
    email: 'inactive@helpdesk.com',
    role: 'CLIENT',
    status: 'INACTIVE',
    permissions: ROLE_PERMISSIONS.CLIENT,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: '2026-04-01T09:00:00.000Z',
  },
]

const mockClientOptions = [
  { id: 'c1', name: 'Acme Corp' },
  { id: 'c2', name: 'Globex' },
  { id: 'c3', name: 'Initech' },
]

const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Hardware',
    description: 'Incidentes y solicitudes de equipos de computo',
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Software',
    description: 'Aplicaciones corporativas y licenciamiento',
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Accesos',
    description: 'Altas, bajas y cambios de permisos',
    status: 'INACTIVE',
  },
]

const mockPriorities: Priority[] = [
  {
    id: '1',
    name: 'Baja',
    level: 'LOW',
    color: '#94a3b8',
    description: 'Impacto minimo en operaciones',
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Media',
    level: 'MEDIUM',
    color: '#247b7b',
    description: 'Afecta a un grupo reducido de usuarios',
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Alta',
    level: 'HIGH',
    color: '#f97316',
    description: 'Interrumpe procesos importantes',
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'Critica',
    level: 'CRITICAL',
    color: '#db3a34',
    description: 'Detiene operaciones criticas del negocio',
    status: 'ACTIVE',
  },
]

const mockSlaPolicies: SlaPolicy[] = [
  {
    id: '1',
    name: 'SLA Baja',
    priorityId: '1',
    priorityName: 'Baja',
    responseHours: 24,
    resolutionHours: 72,
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'SLA Media',
    priorityId: '2',
    priorityName: 'Media',
    responseHours: 8,
    resolutionHours: 48,
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'SLA Alta',
    priorityId: '3',
    priorityName: 'Alta',
    responseHours: 4,
    resolutionHours: 24,
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'SLA Critica',
    priorityId: '4',
    priorityName: 'Critica',
    responseHours: 1,
    resolutionHours: 8,
    status: 'ACTIVE',
  },
]

const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'Acme Corp',
    industry: 'Finanzas',
    region: 'Norte',
    tier: 'GOLD',
    contactEmail: 'soporte@acme.com',
    contactPhone: '+52 81 1234 5678',
    activeTickets: 12,
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Globex',
    industry: 'Retail',
    region: 'Centro',
    tier: 'SILVER',
    contactEmail: 'it@globex.com',
    contactPhone: '+52 55 8765 4321',
    activeTickets: 7,
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Initech',
    industry: 'Tecnologia',
    region: 'Sur',
    tier: 'PLATINUM',
    contactEmail: 'mesa@initech.com',
    contactPhone: '+52 33 2468 1357',
    activeTickets: 19,
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'Umbrella',
    industry: 'Salud',
    region: 'Norte',
    tier: 'BRONZE',
    contactEmail: 'help@umbrella.com',
    contactPhone: '+52 81 5555 1212',
    activeTickets: 4,
    status: 'ACTIVE',
  },
  {
    id: '5',
    name: 'Wayne Enterprises',
    industry: 'Manufactura',
    region: 'Occidente',
    tier: 'GOLD',
    contactEmail: 'ops@wayne.com',
    contactPhone: '+52 33 9999 8888',
    activeTickets: 9,
    status: 'ACTIVE',
  },
]

async function applyE2eDelay(request: Request) {
  const delayMs = Number(request.headers.get('X-TicketFlow-Delay-Ms') || 0)
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

function findUserByToken(authHeader: string | null): User | undefined {
  if (!authHeader?.startsWith('Bearer ')) return undefined
  const token = authHeader.replace('Bearer ', '')
  if (token === 'mock-token-refreshed') return mockUsers[0]
  const userId = token.replace('mock-token-', '')
  return mockUsers.find((u) => u.id === userId)
}

async function updateOwnProfileMock({ request }: { request: Request }) {
  const user = findUserByToken(request.headers.get('Authorization'))
  if (!user) {
    return HttpResponse.json(
      { success: false, message: 'No autenticado', data: null, meta: null },
      { status: 401 },
    )
  }
  const body = (await request.json()) as { fullName?: string }
  const fullName = body.fullName?.trim() ?? ''
  if (fullName.length < 3) {
    return HttpResponse.json(
      {
        success: false,
        message: 'El nombre debe tener al menos 3 caracteres',
        data: null,
        meta: null,
      },
      { status: 400 },
    )
  }
  user.fullName = fullName
  return HttpResponse.json({
    success: true,
    message: 'Perfil actualizado',
    data: { ...user, permissions: [...user.permissions] },
    meta: null,
  })
}

function paginate<T>(items: T[], page = 1, perPage = 10) {
  const start = (page - 1) * perPage
  const data = items.slice(start, start + perPage)
  return {
    data,
    meta: {
      page,
      perPage,
      total: items.length,
      totalPages: Math.ceil(items.length / perPage) || 1,
    },
  }
}

export const handlers = [
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    const user = mockUsers.find((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())
    if (!user || body.password !== (mockPasswords[user.id] ?? 'password') || user.status !== 'ACTIVE') {
      return HttpResponse.json(
        {
          success: false,
          message: 'Credenciales inválidas o cuenta no disponible.',
          data: null,
          meta: null,
        },
        { status: 401 },
      )
    }
    user.lastLoginAt = new Date().toISOString()
    return HttpResponse.json({
      success: true,
      message: 'Login exitoso',
      data: {
        accessToken: `mock-token-${user.id}`,
        refreshToken: `mock-refresh-${user.id}`,
        user,
      },
      meta: null,
    })
  }),

  http.post('*/auth/refresh', async () =>
    HttpResponse.json({
      success: true,
      message: 'Token renovado',
      data: { accessToken: 'mock-token-refreshed' },
      meta: null,
    }),
  ),

  http.post('*/auth/logout', async () =>
    HttpResponse.json({ success: true, message: 'Sesión cerrada', data: null, meta: null }),
  ),

  http.post('*/auth/change-password', async ({ request }) => {
    const actor = findUserByToken(request.headers.get('Authorization'))
    if (!actor) {
      return HttpResponse.json(
        { success: false, message: 'No autenticado', data: null, meta: null },
        { status: 401 },
      )
    }
    const body = (await request.json()) as { currentPassword: string; newPassword: string }
    const expected = mockPasswords[actor.id] ?? 'password'
    if (body.currentPassword !== expected && body.currentPassword !== 'Tf-A7k9!mQ2x') {
      return HttpResponse.json(
        { success: false, message: 'La contraseña actual no es correcta.', data: null, meta: null },
        { status: 401 },
      )
    }
    if (body.currentPassword === body.newPassword) {
      return HttpResponse.json(
        {
          success: false,
          message: 'La contraseña nueva debe ser diferente de la actual.',
          data: null,
          meta: null,
        },
        { status: 400 },
      )
    }
    const policy = validatePasswordPolicy(body.newPassword)
    if (!policy.ok) {
      return HttpResponse.json(
        { success: false, message: policy.message, data: null, meta: null },
        { status: 400 },
      )
    }
    mockPasswords[actor.id] = body.newPassword
    actor.mustChangePassword = false
    return HttpResponse.json({
      success: true,
      message: 'Tu contraseña se actualizó correctamente.',
      data: null,
      meta: null,
    })
  }),

  http.get('*/auth/me', async ({ request }) => {
    await applyE2eDelay(request)
    const user = findUserByToken(request.headers.get('Authorization'))
    if (!user) {
      return HttpResponse.json(
        { success: false, message: 'No autenticado', data: null, meta: null },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, message: 'OK', data: user, meta: null })
  }),

  http.put('*/auth/me', updateOwnProfileMock),
  http.patch('*/auth/me', updateOwnProfileMock),

  http.get('*/users', async ({ request }) => {
    if (request.headers.get('X-TicketFlow-Fail-Users') === '1') {
      return HttpResponse.json(
        { success: false, message: 'Fallo de prueba', data: null, meta: null },
        { status: 500 },
      )
    }
    const url = new URL(request.url)
    let filtered = [...mockUsers]
    const role = url.searchParams.get('role')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    if (role) filtered = filtered.filter((u) => u.role === role)
    if (status) filtered = filtered.filter((u) => u.status === status)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    }
    const page = Number(url.searchParams.get('page')) || 1
    const perPage = Number(url.searchParams.get('perPage')) || 10
    const result = paginate(filtered, page, perPage)
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: result.data,
      meta: result.meta,
    })
  }),

  http.get('*/users/assignable', async () => {
    const agents = mockUsers.filter((user) => user.role === 'AGENT' && user.status === 'ACTIVE')
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: agents,
      meta: null,
    })
  }),

  http.get('*/users/client-options', async ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const filtered = mockClientOptions.filter((item) => item.name.toLowerCase().includes(search))
    const page = Number(url.searchParams.get('page')) || 1
    const perPage = Number(url.searchParams.get('perPage')) || 20
    const result = paginate(filtered, page, perPage)
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: result.data,
      meta: result.meta,
    })
  }),

  http.get('*/users/requesters', async () => {
    const requesters = mockUsers.filter(
      (user) => (user.role === 'REQUESTER' || user.role === 'CLIENT') && user.status === 'ACTIVE',
    )
    return HttpResponse.json({ success: true, message: 'OK', data: requesters, meta: null })
  }),

  http.get('*/notifications/unread-count', async ({ request }) => {
    const actor = findUserByToken(request.headers.get('Authorization'))
    if (!actor) {
      return HttpResponse.json({ success: false, message: 'No autenticado', data: null, meta: null }, { status: 401 })
    }
    return HttpResponse.json({ success: true, message: 'OK', data: { count: unreadCount(actor.id) }, meta: null })
  }),

  http.patch('*/notifications/read-all', async ({ request }) => {
    const actor = findUserByToken(request.headers.get('Authorization'))
    if (!actor) {
      return HttpResponse.json({ success: false, message: 'No autenticado', data: null, meta: null }, { status: 401 })
    }
    markAllRead(actor.id)
    return HttpResponse.json({ success: true, message: 'Notificaciones actualizadas', data: { updated: true }, meta: null })
  }),

  http.patch('*/notifications/:id/read', async ({ params, request }) => {
    const actor = findUserByToken(request.headers.get('Authorization'))
    if (!actor) {
      return HttpResponse.json({ success: false, message: 'No autenticado', data: null, meta: null }, { status: 401 })
    }
    const item = markNotificationRead(String(params.id), actor.id)
    if (!item) {
      return HttpResponse.json({ success: false, message: 'Notificación no encontrada', data: null, meta: null }, { status: 404 })
    }
    return HttpResponse.json({ success: true, message: 'Notificación leída', data: item, meta: null })
  }),

  http.get('*/notifications', async ({ request }) => {
    const actor = findUserByToken(request.headers.get('Authorization'))
    if (!actor) {
      return HttpResponse.json({ success: false, message: 'No autenticado', data: null, meta: null }, { status: 401 })
    }
    const url = new URL(request.url)
    const result = listNotifications(actor.id, {
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
      unread: url.searchParams.get('unread') === 'true',
    })
    return HttpResponse.json({ success: true, message: 'OK', data: result.items, meta: result.meta })
  }),

  http.get('*/users/:id', async ({ params, request }) => {
    const user = mockUsers.find((u) => u.id === params.id)
    if (!user) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }
    void request
    return HttpResponse.json({ success: true, message: 'OK', data: user, meta: null })
  }),

  http.post('*/users', async ({ request }) => {
    const body = (await request.json()) as {
      fullName: string
      email: string
      password: string
      role: UserRole
      clientId?: string
    }
    if (body.role === 'REQUESTER' && !body.clientId) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Selecciona el cliente al que pertenece el solicitante.',
          data: null,
          meta: null,
        },
        { status: 400 },
      )
    }
    const client = mockClientOptions.find((item) => item.id === body.clientId)
    if (mockUsers.some((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Ya existe un usuario registrado con ese correo electrónico.',
          data: null,
          meta: null,
        },
        { status: 409 },
      )
    }
    const newUser: User = {
      id: `u-${Date.now()}-${mockUsers.length}`,
      fullName: body.fullName,
      email: body.email.trim().toLowerCase(),
      role: body.role,
      status: 'ACTIVE',
      clientId: body.role === 'REQUESTER' ? client?.id ?? null : null,
      clientName: body.role === 'REQUESTER' ? client?.name ?? null : null,
      permissions: ROLE_PERMISSIONS[body.role],
      mustChangePassword: false,
    }
    mockUsers.push(newUser)
    mockPasswords[newUser.id] = body.password
    return HttpResponse.json(
      { success: true, message: 'Usuario creado', data: newUser, meta: null },
      { status: 201 },
    )
  }),

  http.put('*/users/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<User>
    const index = mockUsers.findIndex((u) => u.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }
    const updated: User = {
      ...mockUsers[index],
      ...body,
      permissions: body.role ? ROLE_PERMISSIONS[body.role] : mockUsers[index].permissions,
    }
    mockUsers[index] = updated
    return HttpResponse.json({
      success: true,
      message: 'Usuario actualizado',
      data: updated,
      meta: null,
    })
  }),

  http.patch('*/users/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: UserStatus }
    const index = mockUsers.findIndex((u) => u.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }
    mockUsers[index] = { ...mockUsers[index], status: body.status }
    return HttpResponse.json({
      success: true,
      message: 'Estado actualizado',
      data: mockUsers[index],
      meta: null,
    })
  }),

  http.post('*/users/:id/reset-password', async ({ params, request }) => {
    const actor = findUserByToken(request.headers.get('Authorization'))
    if (actor?.role !== 'ADMIN') {
      return HttpResponse.json(
        {
          success: false,
          message: 'No tienes permisos para realizar esta acción',
          data: null,
          meta: null,
        },
        { status: 403 },
      )
    }
    const user = mockUsers.find((item) => item.id === params.id)
    if (!user) {
      return HttpResponse.json(
        { success: false, message: 'Usuario no encontrado', data: null, meta: null },
        { status: 404 },
      )
    }
    if (user.status !== 'ACTIVE') {
      return HttpResponse.json(
        {
          success: false,
          message: 'No se puede restablecer la contraseña de un usuario inactivo',
          data: null,
          meta: null,
        },
        { status: 409 },
      )
    }
    user.mustChangePassword = true
    mockPasswords[user.id] = 'Tf-A7k9!mQ2x'
    return HttpResponse.json({
      success: true,
      message: 'La contraseña se restableció correctamente.',
      data: { temporaryPassword: 'Tf-A7k9!mQ2x' },
      meta: null,
    })
  }),

  http.get('*/api/v1/categories', async ({ request }) => {
    if (request.headers.get('X-TicketFlow-Empty-Catalogs') === '1') {
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: [],
        meta: { total: 0, page: 1, perPage: 100, totalPages: 0 },
      })
    }

    const url = new URL(request.url)
    let filtered = [...mockCategories]
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    if (status) filtered = filtered.filter((category) => category.status === status)

    if (search) {
      const query = search.toLowerCase()
      filtered = filtered.filter(
        (category) =>
          category.name.toLowerCase().includes(query) ||
          category.description.toLowerCase().includes(query),
      )
    }

    const page = Number(url.searchParams.get('page')) || 1
    const perPage = Number(url.searchParams.get('perPage')) || 10
    const result = paginate(filtered, page, perPage)

    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: result.data,
      meta: result.meta,
    })
  }),

  http.post('*/api/v1/categories', async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string }
    const name = body.name?.trim()

    if (!name) {
      return HttpResponse.json(
        { success: false, message: 'El nombre es obligatorio', data: null, meta: null },
        { status: 422 },
      )
    }

    const duplicate = mockCategories.some(
      (category) => category.name.toLowerCase() === name.toLowerCase(),
    )
    if (duplicate) {
      return HttpResponse.json(
        { success: false, message: 'La categoria ya existe', data: null, meta: null },
        { status: 422 },
      )
    }

    const newCategory: Category = {
      id: String(mockCategories.length + 1),
      name,
      description: body.description?.trim() || '',
      status: 'ACTIVE',
    }

    mockCategories.push(newCategory)

    return HttpResponse.json(
      { success: true, message: 'Categoria creada', data: newCategory, meta: null },
      { status: 201 },
    )
  }),

  http.put('*/api/v1/categories/:id', async ({ params, request }) => {
    const body = (await request.json()) as { name?: string; description?: string }
    const index = mockCategories.findIndex((category) => category.id === params.id)

    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }

    const name = body.name?.trim() || mockCategories[index].name
    const duplicate = mockCategories.some(
      (category, categoryIndex) =>
        categoryIndex !== index && category.name.toLowerCase() === name.toLowerCase(),
    )

    if (duplicate) {
      return HttpResponse.json(
        { success: false, message: 'La categoria ya existe', data: null, meta: null },
        { status: 422 },
      )
    }

    const updatedCategory: Category = {
      ...mockCategories[index],
      name,
      description:
        typeof body.description === 'string'
          ? body.description.trim()
          : mockCategories[index].description,
    }

    mockCategories[index] = updatedCategory

    return HttpResponse.json({
      success: true,
      message: 'Categoria actualizada',
      data: updatedCategory,
      meta: null,
    })
  }),

  http.delete('*/api/v1/categories/:id', async ({ params }) => {
    const index = mockCategories.findIndex((category) => category.id === params.id)

    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }

    const updatedCategory: Category = {
      ...mockCategories[index],
      status: 'INACTIVE',
    }

    mockCategories[index] = updatedCategory

    return HttpResponse.json({
      success: true,
      message: 'Categoria desactivada',
      data: updatedCategory,
      meta: null,
    })
  }),

  http.patch('*/api/v1/categories/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: Category['status'] }
    const index = mockCategories.findIndex((category) => category.id === params.id)

    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }

    const updatedCategory: Category = {
      ...mockCategories[index],
      status: body.status,
    }

    mockCategories[index] = updatedCategory

    return HttpResponse.json({
      success: true,
      message: 'Estado de categoría actualizado',
      data: updatedCategory,
      meta: null,
    })
  }),

  http.get('*/priorities', async ({ request }) => {
    if (request.headers.get('X-TicketFlow-Empty-Catalogs') === '1') {
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: [],
        meta: { total: 0, page: 1, perPage: 100, totalPages: 0 },
      })
    }

    const url = new URL(request.url)
    let filtered = [...mockPriorities]
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    if (status) filtered = filtered.filter((priority) => priority.status === status)

    if (search) {
      const query = search.toLowerCase()
      filtered = filtered.filter(
        (priority) =>
          priority.name.toLowerCase().includes(query) ||
          priority.description.toLowerCase().includes(query),
      )
    }

    const page = Number(url.searchParams.get('page')) || 1
    const perPage = Number(url.searchParams.get('perPage')) || 10
    const result = paginate(filtered, page, perPage)

    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: result.data,
      meta: result.meta,
    })
  }),

  http.post('*/priorities', async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      level: Priority['level']
      color?: string
      description?: string
    }
    const name = body.name?.trim()

    if (!name) {
      return HttpResponse.json(
        { success: false, message: 'El nombre es obligatorio', data: null, meta: null },
        { status: 422 },
      )
    }

    const newPriority: Priority = {
      id: String(mockPriorities.length + 1),
      name,
      level: body.level,
      color: body.color || '#247b7b',
      description: body.description?.trim() || '',
      status: 'ACTIVE',
    }

    mockPriorities.push(newPriority)

    return HttpResponse.json(
      { success: true, message: 'Prioridad creada', data: newPriority, meta: null },
      { status: 201 },
    )
  }),

  http.put('*/priorities/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Priority>
    const index = mockPriorities.findIndex((priority) => priority.id === params.id)

    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }

    const updatedPriority: Priority = {
      ...mockPriorities[index],
      name: body.name?.trim() || mockPriorities[index].name,
      level: body.level || mockPriorities[index].level,
      color: body.color || mockPriorities[index].color,
      description:
        typeof body.description === 'string'
          ? body.description.trim()
          : mockPriorities[index].description,
    }

    mockPriorities[index] = updatedPriority

    return HttpResponse.json({
      success: true,
      message: 'Prioridad actualizada',
      data: updatedPriority,
      meta: null,
    })
  }),

  http.get('*/sla-policies', async ({ request }) => {
    const url = new URL(request.url)
    let filtered = [...mockSlaPolicies]
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    if (status) filtered = filtered.filter((policy) => policy.status === status)

    if (search) {
      const query = search.toLowerCase()
      filtered = filtered.filter(
        (policy) =>
          policy.name.toLowerCase().includes(query) ||
          policy.priorityName.toLowerCase().includes(query),
      )
    }

    const page = Number(url.searchParams.get('page')) || 1
    const perPage = Number(url.searchParams.get('perPage')) || 10
    const result = paginate(filtered, page, perPage)

    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: result.data,
      meta: result.meta,
    })
  }),

  http.post('*/sla-policies', async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      priorityId: string
      responseHours: number
      resolutionHours: number
    }
    const name = body.name?.trim()
    const priority = mockPriorities.find((item) => item.id === body.priorityId)

    if (!name) {
      return HttpResponse.json(
        { success: false, message: 'El nombre es obligatorio', data: null, meta: null },
        { status: 422 },
      )
    }
    if (!priority) {
      return HttpResponse.json(
        { success: false, message: 'Prioridad no encontrada', data: null, meta: null },
        { status: 422 },
      )
    }
    if (mockSlaPolicies.some((policy) => policy.priorityId === priority.id)) {
      return HttpResponse.json(
        { success: false, message: 'Ya existe una política SLA para esa prioridad', data: null, meta: null },
        { status: 409 },
      )
    }

    const newPolicy: SlaPolicy = {
      id: String(mockSlaPolicies.length + 1),
      name,
      priorityId: priority.id,
      priorityName: priority.name,
      responseHours: body.responseHours,
      resolutionHours: body.resolutionHours,
      status: 'ACTIVE',
    }

    mockSlaPolicies.push(newPolicy)

    return HttpResponse.json(
      { success: true, message: 'Politica SLA creada', data: newPolicy, meta: null },
      { status: 201 },
    )
  }),

  http.put('*/sla-policies/:id', async ({ params, request }) => {
    const body = (await request.json()) as {
      name?: string
      priorityId?: string
      responseHours?: number
      resolutionHours?: number
    }
    const index = mockSlaPolicies.findIndex((policy) => policy.id === params.id)

    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }

    const priority = mockPriorities.find((item) => item.id === body.priorityId)
    if (priority && mockSlaPolicies.some((policy) => policy.priorityId === priority.id && policy.id !== params.id)) {
      return HttpResponse.json(
        { success: false, message: 'Ya existe una política SLA para esa prioridad', data: null, meta: null },
        { status: 409 },
      )
    }

    const updatedPolicy: SlaPolicy = {
      ...mockSlaPolicies[index],
      name: body.name?.trim() || mockSlaPolicies[index].name,
      priorityId: priority?.id || mockSlaPolicies[index].priorityId,
      priorityName: priority?.name || mockSlaPolicies[index].priorityName,
      responseHours: body.responseHours ?? mockSlaPolicies[index].responseHours,
      resolutionHours: body.resolutionHours ?? mockSlaPolicies[index].resolutionHours,
    }

    mockSlaPolicies[index] = updatedPolicy

    return HttpResponse.json({
      success: true,
      message: 'Politica SLA actualizada',
      data: updatedPolicy,
      meta: null,
    })
  }),

  http.get('*/companies', async ({ request }) => {
    const url = new URL(request.url)
    let filtered = [...mockCompanies]
    const industry = url.searchParams.get('industry')
    const region = url.searchParams.get('region')
    const tier = url.searchParams.get('tier')
    const search = url.searchParams.get('search')

    if (industry) filtered = filtered.filter((company) => company.industry === industry)
    if (region) filtered = filtered.filter((company) => company.region === region)
    if (tier) filtered = filtered.filter((company) => company.tier === tier)
    if (search) {
      const query = search.toLowerCase()
      filtered = filtered.filter((company) => company.name.toLowerCase().includes(query))
    }

    const page = Number(url.searchParams.get('page')) || 1
    const perPage = Number(url.searchParams.get('perPage')) || 10
    const result = paginate(filtered, page, perPage)

    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: result.data,
      meta: result.meta,
    })
  }),

  http.get('*/companies/:id', async ({ params }) => {
    const company = mockCompanies.find((item) => item.id === params.id)

    if (!company) {
      return HttpResponse.json(
        { success: false, message: 'No encontrado', data: null, meta: null },
        { status: 404 },
      )
    }

    return HttpResponse.json({ success: true, message: 'OK', data: company, meta: null })
  }),

  ...createCrmHandlers(mockUsers),
  ...createTicketHandlers(mockUsers),
  ...createAccessHandlers(mockUsers, findUserByToken),

  http.get('*/knowledge-articles/:id', async ({ params }) => {
    const id = String(params.id)
    if (isKnowledgeUuid(id)) {
      return HttpResponse.json(
        { success: false, message: 'Artículo no encontrado', data: null, meta: null },
        { status: 404 },
      )
    }
    const article = findMockKnowledgeArticle(id)
    if (!article) {
      return HttpResponse.json(
        { success: false, message: 'Artículo no encontrado', data: null, meta: null },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, message: 'OK', data: article, meta: null })
  }),

  http.get('*/knowledge-articles', async ({ request }) => {
    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const filtered = mockKnowledgeArticles.filter((article) => {
      if (article.status !== 'ACTIVE') return false
      if (!search) return true
      return (
        article.title.toLowerCase().includes(search) ||
        article.content.toLowerCase().includes(search) ||
        article.tags.toLowerCase().includes(search)
      )
    })
    return HttpResponse.json({ success: true, message: 'OK', data: filtered, meta: null })
  }),

  http.post('*/knowledge-articles', async ({ request }) => {
    const body = (await request.json()) as {
      title: string
      content: string
      tags?: string
      categoryId?: string | null
    }
    if (body.categoryId) {
      const category = mockCategories.find((item) => item.id === body.categoryId)
      if (!category) {
        return HttpResponse.json(
          { success: false, message: 'Categoría no encontrada', data: null, meta: null },
          { status: 404 },
        )
      }
    }
    const article = {
      id: `k${Date.now()}`,
      title: body.title.trim(),
      content: body.content.trim(),
      tags: body.tags?.trim() ?? '',
      topic: 'General',
      category: body.categoryId
        ? mockCategories
            .filter((item) => item.id === body.categoryId)
            .map((item) => ({ id: item.id, name: item.name }))[0] ?? null
        : null,
      author: { id: '1', fullName: 'Admin Sistema' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE' as const,
    }
    mockKnowledgeArticles.push(article)
    return HttpResponse.json(
      { success: true, message: 'Artículo creado', data: article, meta: null },
      { status: 201 },
    )
  }),

  http.put('*/knowledge-articles/:id', async ({ params, request }) => {
    const body = (await request.json()) as {
      title?: string
      content?: string
      tags?: string
      categoryId?: string | null
    }
    const index = mockKnowledgeArticles.findIndex((article) => article.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: 'Artículo no encontrado', data: null, meta: null },
        { status: 404 },
      )
    }
    if (body.categoryId) {
      const category = mockCategories.find((item) => item.id === body.categoryId)
      if (!category) {
        return HttpResponse.json(
          { success: false, message: 'Categoría no encontrada', data: null, meta: null },
          { status: 404 },
        )
      }
    }
    const current = mockKnowledgeArticles[index]
    mockKnowledgeArticles[index] = {
      ...current,
      title: body.title?.trim() ?? current.title,
      content: body.content?.trim() ?? current.content,
      tags: body.tags !== undefined ? body.tags.trim() : current.tags,
      category:
        body.categoryId === null
          ? null
          : body.categoryId
            ? {
                id: body.categoryId,
                name: mockCategories.find((item) => item.id === body.categoryId)?.name ?? 'General',
              }
            : current.category,
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json({
      success: true,
      message: 'Artículo actualizado',
      data: mockKnowledgeArticles[index],
      meta: null,
    })
  }),

  http.delete('*/knowledge-articles/:id', async ({ params }) => {
    const article = findMockKnowledgeArticleIncludingInactive(String(params.id))
    if (!article) {
      return HttpResponse.json(
        { success: false, message: 'Artículo no encontrado', data: null, meta: null },
        { status: 404 },
      )
    }
    article.status = 'INACTIVE'
    return HttpResponse.json({
      success: true,
      message: 'Artículo desactivado',
      data: article,
      meta: null,
    })
  }),
]

export async function enableMocking() {
  const { setupWorker } = await import('msw/browser')
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass' })
}
