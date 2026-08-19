import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ApiExceptionFilter } from '../common/api'
import { ROLE_PERMISSION_CODES } from '../common/permissions'
import { RoleCode, UserStatus } from '../database/entities'
import { MustChangePasswordGuard, PermissionsGuard } from '../auth/auth.guard'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

describe('HTTP administración de usuarios', () => {
  let app: INestApplication
  let currentUser: ReturnType<typeof actor>

  const usersService = {
    list: jest.fn().mockResolvedValue({ items: [{ id: 'user-1', email: 'agent@helpdesk.com' }], meta: { page: 1, perPage: 10, total: 1, totalPages: 1 } }),
    listAssignable: jest.fn().mockResolvedValue([{ id: 'agent-1', role: 'AGENT' }]),
    find: jest.fn(),
    serialize: jest.fn((user) => user),
    create: jest.fn().mockResolvedValue({ id: 'new-user', email: 'nuevo@helpdesk.com' }),
    update: jest.fn().mockResolvedValue({ id: 'user-1', fullName: 'Actualizado' }),
    resetPassword: jest.fn().mockResolvedValue({ message: 'La contraseña se restableció correctamente.', temporaryPassword: 'Tf-A7k9!mQ2x' }),
    setStatus: jest.fn().mockResolvedValue({ id: 'user-1', status: 'INACTIVE' }),
  }

  beforeAll(async () => {
    class TestJwtGuard implements CanActivate {
      canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest().user = currentUser
        return true
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
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
    usersService.list.mockResolvedValue({ items: [{ id: 'user-1', email: 'agent@helpdesk.com' }], meta: { page: 1, perPage: 10, total: 1, totalPages: 1 } })
    usersService.resetPassword.mockResolvedValue({
      message: 'La contraseña se restableció correctamente.',
      temporaryPassword: 'Tf-A7k9!mQ2x',
    })
  })

  it('ADMIN puede listar, crear, editar, desactivar y restablecer', async () => {
    currentUser = actor(RoleCode.ADMIN)
    const id = '11111111-1111-4111-8111-111111111111'

    expect((await request(app.getHttpServer()).get('/api/v1/users')).status).toBe(200)
    expect(
      [
        200, 201,
      ].includes(
        (
          await request(app.getHttpServer()).post('/api/v1/users').send({
            fullName: 'Nuevo Agente',
            email: 'nuevo@helpdesk.com',
            password: 'Password1!',
            role: 'AGENT',
          })
        ).status,
      ),
    ).toBe(true)
    expect((await request(app.getHttpServer()).put(`/api/v1/users/${id}`).send({ fullName: 'Agente Editado' })).status).toBe(200)
    expect((await request(app.getHttpServer()).patch(`/api/v1/users/${id}/status`).send({ status: 'INACTIVE' })).status).toBe(200)
    expect(
      [200, 201].includes((await request(app.getHttpServer()).post(`/api/v1/users/${id}/reset-password`)).status),
    ).toBe(true)
  })

  it.each([RoleCode.SUPERVISOR, RoleCode.AGENT, RoleCode.REQUESTER])('%s recibe 403 al administrar usuarios', async (role) => {
    currentUser = actor(role)
    const id = '11111111-1111-4111-8111-111111111111'
    const list = await request(app.getHttpServer()).get('/api/v1/users')
    expect(list.status).toBe(403)
    expect(
      (
        await request(app.getHttpServer()).post('/api/v1/users').send({
          fullName: 'Nuevo Agente',
          email: 'nuevo@helpdesk.com',
          password: 'Password1!',
          role: 'AGENT',
        })
      ).status,
    ).toBe(403)
    expect((await request(app.getHttpServer()).put(`/api/v1/users/${id}`).send({ fullName: 'Agente Editado' })).status).toBe(403)
    expect((await request(app.getHttpServer()).patch(`/api/v1/users/${id}/status`).send({ status: 'INACTIVE' })).status).toBe(403)
    expect((await request(app.getHttpServer()).post(`/api/v1/users/${id}/reset-password`)).status).toBe(403)
    expect(usersService.resetPassword).not.toHaveBeenCalled()
  })

  it('SUPERVISOR puede consultar usuarios asignables', async () => {
    currentUser = actor(RoleCode.SUPERVISOR)
    const response = await request(app.getHttpServer()).get('/api/v1/users/assignable')
    expect(response.status).toBe(200)
    expect(usersService.listAssignable).toHaveBeenCalled()
  })

  it('UUID inválido en restablecimiento produce 400', async () => {
    currentUser = actor(RoleCode.ADMIN)
    const response = await request(app.getHttpServer()).post('/api/v1/users/no-uuid/reset-password')
    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/UUID/i)
    expect(usersService.resetPassword).not.toHaveBeenCalled()
  })

  it('un usuario con cambio obligatorio no puede listar usuarios', async () => {
    currentUser = actor(RoleCode.ADMIN, { mustChangePassword: true })
    const response = await request(app.getHttpServer()).get('/api/v1/users')
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('PASSWORD_CHANGE_REQUIRED')
    expect(response.body.message).toBe('Debes cambiar tu contraseña temporal antes de continuar.')
  })
})

function actor(role: RoleCode, extra: { mustChangePassword?: boolean } = {}) {
  return {
    id: `${role.toLowerCase()}-id`,
    fullName: role,
    email: `${role.toLowerCase()}@helpdesk.com`,
    status: UserStatus.ACTIVE,
    mustChangePassword: extra.mustChangePassword ?? false,
    role: {
      code: role,
      permissions: ROLE_PERMISSION_CODES[role].map((code) => ({ code })),
    },
  }
}
