import { CanActivate, ExecutionContext, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ApiExceptionFilter } from '../common/api'
import { ROLE_PERMISSION_CODES } from '../common/permissions'
import { RoleCode, UserStatus } from '../database/entities'
import { MustChangePasswordGuard, PermissionsGuard } from '../auth/auth.guard'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

describe('HTTP notificaciones', () => {
  let app: INestApplication
  let currentUser: ReturnType<typeof actor>
  const notifications = {
    list: jest.fn(),
    unreadCount: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  }

  beforeAll(async () => {
    class TestJwtGuard implements CanActivate {
      canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest().user = currentUser
        return true
      }
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: APP_GUARD, useClass: TestJwtGuard },
        { provide: APP_GUARD, useClass: MustChangePasswordGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalFilters(new ApiExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    currentUser = actor(RoleCode.REQUESTER)
    notifications.list.mockResolvedValue({
      items: [{ id: 'n1', title: 'Ticket creado', message: 'Tu ticket HD-2026-0008 se registró correctamente.', readAt: null }],
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    })
    notifications.unreadCount.mockResolvedValue({ count: 1 })
    notifications.markRead.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', readAt: '2026-08-19T00:00:00.000Z' })
    notifications.markAllRead.mockResolvedValue({ updated: true })
  })

  it('lista solo las notificaciones del usuario autenticado', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/notifications?page=1&perPage=20&unread=true')
    expect(response.status).toBe(200)
    expect(notifications.list).toHaveBeenCalledWith(currentUser, expect.objectContaining({ unread: true, page: 1, perPage: 20 }))
    expect(JSON.stringify(response.body.data)).not.toMatch(/STATUS_CHANGED|password|token/i)
  })

  it('el contador coincide con no leídas', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/notifications/unread-count')
    expect(response.status).toBe(200)
    expect(response.body.data.count).toBe(1)
  })

  it('marcar como leída es idempotente', async () => {
    const id = '11111111-1111-4111-8111-111111111111'
    notifications.markRead.mockResolvedValueOnce({ id, readAt: '2026-08-19T00:00:00.000Z' })
    notifications.markRead.mockResolvedValueOnce({ id, readAt: '2026-08-19T00:00:00.000Z' })
    expect((await request(app.getHttpServer()).patch(`/api/v1/notifications/${id}/read`)).status).toBe(200)
    expect((await request(app.getHttpServer()).patch(`/api/v1/notifications/${id}/read`)).status).toBe(200)
    expect(notifications.markRead).toHaveBeenCalledTimes(2)
  })

  it('read-all solo afecta al usuario autenticado', async () => {
    const response = await request(app.getHttpServer()).patch('/api/v1/notifications/read-all')
    expect(response.status).toBe(200)
    expect(notifications.markAllRead).toHaveBeenCalledWith(currentUser)
  })

  it('UUID inválido produce 400', async () => {
    const response = await request(app.getHttpServer()).patch('/api/v1/notifications/no-uuid/read')
    expect(response.status).toBe(400)
    expect(notifications.markRead).not.toHaveBeenCalled()
  })

  it('acceso ajeno se oculta con 404', async () => {
    notifications.markRead.mockRejectedValue(new NotFoundException('Notificación no encontrada'))
    const response = await request(app.getHttpServer()).patch('/api/v1/notifications/11111111-1111-4111-8111-111111111111/read')
    expect(response.status).toBe(404)
  })
})

function actor(role: RoleCode) {
  return {
    id: `${role.toLowerCase()}-id`,
    fullName: role,
    email: `${role.toLowerCase()}@helpdesk.com`,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    role: {
      code: role,
      permissions: ROLE_PERMISSION_CODES[role].map((code) => ({ code })),
    },
  }
}
