import { http, HttpResponse } from 'msw'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import type { User, UserRole, UserStatus } from '@/types/user.types'

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
    return HttpResponse.json({ success: true, message: 'Usuario actualizado', data: updated, meta: null })
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
]

export async function enableMocking() {
  const { setupWorker } = await import('msw/browser')
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass' })
}
