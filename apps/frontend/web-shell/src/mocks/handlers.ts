import { http, HttpResponse } from 'msw'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import type { Category, Company, Priority, SlaPolicy } from '@/types/catalog.types'
import type {
  SlaComplianceSummary,
  TicketsByAgentItem,
  TicketsByCategoryItem,
  TicketsByCompanyItem,
  TicketsByStatusItem,
} from '@/types/report.types'
import type { User, UserRole, UserStatus } from '@/types/user.types'
import { createTicketHandlers } from '@/mocks/ticket.handlers'

const mockUsers: User[] = [
  {
    id: '1',
    fullName: 'Admin Sistema',
    email: 'admin@helpdesk.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    permissions: ROLE_PERMISSIONS.ADMIN,
  },
  {
    id: '2',
    fullName: 'Agente Soporte',
    email: 'agent@helpdesk.com',
    role: 'AGENT',
    status: 'ACTIVE',
    permissions: ROLE_PERMISSIONS.AGENT,
  },
  {
    id: '3',
    fullName: 'Supervisor Mesa',
    email: 'supervisor@helpdesk.com',
    role: 'SUPERVISOR',
    status: 'ACTIVE',
    permissions: ROLE_PERMISSIONS.SUPERVISOR,
  },
  {
    id: '4',
    fullName: 'Usuario Solicitante',
    email: 'requester@helpdesk.com',
    role: 'REQUESTER',
    status: 'ACTIVE',
    permissions: ROLE_PERMISSIONS.REQUESTER,
  },
  {
    id: '5',
    fullName: 'Usuario Inactivo',
    email: 'inactive@helpdesk.com',
    role: 'REQUESTER',
    status: 'INACTIVE',
    permissions: ROLE_PERMISSIONS.REQUESTER,
  },
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

const reportTicketsByStatus: TicketsByStatusItem[] = [
  { status: 'OPEN', count: 42, percentage: 17.2 },
  { status: 'IN_PROGRESS', count: 67, percentage: 27.5 },
  { status: 'RESOLVED', count: 118, percentage: 48.4 },
  { status: 'OVERDUE', count: 17, percentage: 6.9 },
]

const reportTicketsByAgent: TicketsByAgentItem[] = [
  {
    agentId: '2',
    agentName: 'Agente Soporte',
    open: 8,
    inProgress: 5,
    resolved: 21,
    overdue: 2,
    total: 36,
  },
  {
    agentId: '6',
    agentName: 'Laura Campos',
    open: 11,
    inProgress: 9,
    resolved: 34,
    overdue: 4,
    total: 58,
  },
  {
    agentId: '7',
    agentName: 'Jorge Perez',
    open: 7,
    inProgress: 6,
    resolved: 29,
    overdue: 3,
    total: 45,
  },
]

const reportTicketsByCategory: TicketsByCategoryItem[] = [
  { category: 'Hardware', priority: 'Alta', count: 34 },
  { category: 'Hardware', priority: 'Media', count: 22 },
  { category: 'Software', priority: 'Alta', count: 48 },
  { category: 'Software', priority: 'Baja', count: 19 },
  { category: 'Accesos', priority: 'Media', count: 26 },
]

const reportTicketsByCompany: TicketsByCompanyItem[] = [
  { company: 'Acme Corp', industry: 'Finanzas', region: 'Norte', tickets: 47 },
  { company: 'Globex', industry: 'Retail', region: 'Centro', tickets: 35 },
  { company: 'Initech', industry: 'Tecnologia', region: 'Sur', tickets: 54 },
  { company: 'Umbrella', industry: 'Salud', region: 'Norte', tickets: 29 },
]

function buildSlaCompliance(
  startDate?: string | null,
  endDate?: string | null,
): SlaComplianceSummary {
  if (!startDate || !endDate) {
    return {
      periodLabel: 'Ultimos 30 dias',
      withinSla: 182,
      outOfSla: 41,
      withinPercentage: 81.6,
      outPercentage: 18.4,
    }
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)

  const withinSla = Math.max(12, Math.round(diffDays * 4.2))
  const outOfSla = Math.max(2, Math.round(diffDays * 0.9))
  const total = withinSla + outOfSla

  const withinPercentage = Number(((withinSla / total) * 100).toFixed(1))
  const outPercentage = Number((100 - withinPercentage).toFixed(1))

  return {
    periodLabel: `${startDate} a ${endDate}`,
    withinSla,
    outOfSla,
    withinPercentage,
    outPercentage,
  }
}

function findUserByToken(authHeader: string | null): User | undefined {
  if (!authHeader?.startsWith('Bearer ')) return undefined
  const token = authHeader.replace('Bearer ', '')
  if (token === 'mock-token-refreshed') return mockUsers[0]
  const userId = token.replace('mock-token-', '')
  return mockUsers.find((u) => u.id === userId)
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
    const user = mockUsers.find((u) => u.email === body.email)
    if (!user || body.password !== 'password') {
      return HttpResponse.json(
        { success: false, message: 'Credenciales inválidas', data: null, meta: null },
        { status: 401 },
      )
    }
    if (user.status !== 'ACTIVE') {
      return HttpResponse.json(
        { success: false, message: 'Usuario inactivo o bloqueado', data: null, meta: null },
        { status: 403 },
      )
    }
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

  http.get('*/auth/me', async ({ request }) => {
    const user = findUserByToken(request.headers.get('Authorization'))
    if (!user) {
      return HttpResponse.json(
        { success: false, message: 'No autenticado', data: null, meta: null },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, message: 'OK', data: user, meta: null })
  }),

  http.get('*/users', async ({ request }) => {
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
    }
    if (mockUsers.some((u) => u.email === body.email)) {
      return HttpResponse.json(
        { success: false, message: 'El correo ya está registrado', data: null, meta: null },
        { status: 422 },
      )
    }
    const newUser: User = {
      id: String(mockUsers.length + 1),
      fullName: body.fullName,
      email: body.email,
      role: body.role,
      status: 'ACTIVE',
      permissions: ROLE_PERMISSIONS[body.role],
    }
    mockUsers.push(newUser)
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

  http.get('*/api/v1/categories', async ({ request }) => {
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

  http.get('*/priorities', async ({ request }) => {
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

  http.get('*/api/v1/dashboard/summary', async ({ request }) => {
    const user = findUserByToken(request.headers.get('Authorization'))
    const url = new URL(request.url)
    const scopeParam = url.searchParams.get('scope')
    const isAgent = user?.role === 'AGENT' || scopeParam === 'OWN'

    const summary = isAgent
      ? {
          scope: 'OWN',
          kpis: [
            { key: 'open', label: 'Abiertos', value: 8 },
            { key: 'overdue', label: 'Vencidos', value: 2 },
            { key: 'resolved', label: 'Resueltos', value: 21 },
            { key: 'inProgress', label: 'En proceso', value: 5 },
          ],
          trend: [
            { period: 'Lun', open: 4, inProgress: 3, resolved: 5 },
            { period: 'Mar', open: 5, inProgress: 4, resolved: 4 },
            { period: 'Mie', open: 6, inProgress: 3, resolved: 6 },
            { period: 'Jue', open: 5, inProgress: 4, resolved: 5 },
            { period: 'Vie', open: 8, inProgress: 5, resolved: 4 },
          ],
          distribution: [
            { name: 'Abiertos', value: 8 },
            { name: 'En proceso', value: 5 },
            { name: 'Resueltos', value: 21 },
            { name: 'Vencidos', value: 2 },
          ],
        }
      : {
          scope: 'GLOBAL',
          kpis: [
            { key: 'open', label: 'Abiertos', value: 42 },
            { key: 'overdue', label: 'Vencidos', value: 11 },
            { key: 'resolved', label: 'Resueltos', value: 164 },
            { key: 'inProgress', label: 'En proceso', value: 27 },
          ],
          trend: [
            { period: 'Lun', open: 32, inProgress: 24, resolved: 28 },
            { period: 'Mar', open: 36, inProgress: 26, resolved: 30 },
            { period: 'Mie', open: 35, inProgress: 23, resolved: 34 },
            { period: 'Jue', open: 40, inProgress: 25, resolved: 29 },
            { period: 'Vie', open: 42, inProgress: 27, resolved: 43 },
          ],
          distribution: [
            { name: 'Abiertos', value: 42 },
            { name: 'En proceso', value: 27 },
            { name: 'Resueltos', value: 164 },
            { name: 'Vencidos', value: 11 },
          ],
        }

    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: summary,
      meta: null,
    })
  }),

  http.get('*/api/v1/reports/tickets-by-status', async () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: reportTicketsByStatus,
      meta: null,
    }),
  ),

  http.get('*/api/v1/reports/tickets-by-agent', async () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: reportTicketsByAgent,
      meta: null,
    }),
  ),

  http.get('*/api/v1/reports/tickets-by-category', async () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: reportTicketsByCategory,
      meta: null,
    }),
  ),

  http.get('*/api/v1/reports/sla-compliance', async ({ request }) => {
    const url = new URL(request.url)
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const result = buildSlaCompliance(startDate, endDate)

    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: result,
      meta: null,
    })
  }),

  http.get('*/api/v1/reports/tickets-by-company', async () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: reportTicketsByCompany,
      meta: null,
    }),
  ),

  ...createTicketHandlers(mockUsers),
]

export async function enableMocking() {
  const { setupWorker } = await import('msw/browser')
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass' })
}
