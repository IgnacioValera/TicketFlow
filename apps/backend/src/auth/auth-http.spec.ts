import { CanActivate, ExecutionContext, ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ApiExceptionFilter } from '../common/api'
import { ROLE_PERMISSION_CODES } from '../common/permissions'
import { ALLOW_WHILE_PASSWORD_CHANGE_KEY, IS_PUBLIC_KEY } from '../common/security'
import { RoleCode, UserStatus } from '../database/entities'
import { AuthController } from './auth.controller'
import { MustChangePasswordGuard, PermissionsGuard } from './auth.guard'
import { AuthService } from './auth.service'

describe('MustChangePasswordGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() }
  const guard = new MustChangePasswordGuard(reflector as never)

  function ctx(user: { mustChangePassword?: boolean }) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as ExecutionContext
  }

  it('bloquea endpoints normales con código estable', () => {
    reflector.getAllAndOverride.mockReturnValue(false)
    try {
      guard.canActivate(ctx({ mustChangePassword: true }))
      throw new Error('expected forbidden')
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException)
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Debes cambiar tu contraseña temporal antes de continuar.',
      })
    }
  })

  it('permite cambiar la contraseña mientras la bandera está activa', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => key === ALLOW_WHILE_PASSWORD_CHANGE_KEY)
    expect(guard.canActivate(ctx({ mustChangePassword: true }))).toBe(true)
  })

  it('permite rutas públicas', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => key === IS_PUBLIC_KEY)
    expect(guard.canActivate(ctx({ mustChangePassword: true }))).toBe(true)
  })
})

describe('HTTP cambio de contraseña por rol', () => {
  let app: INestApplication
  let currentUser: ReturnType<typeof actor>
  const authService = {
    changePassword: jest.fn().mockResolvedValue(undefined),
    serializeUser: jest.fn((user) => user),
    logout: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    updateOwnProfile: jest.fn(),
  }

  beforeAll(async () => {
    class TestJwtGuard implements CanActivate {
      canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest().user = currentUser
        return true
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
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
    authService.changePassword.mockClear()
  })

  it.each([RoleCode.ADMIN, RoleCode.SUPERVISOR, RoleCode.AGENT, RoleCode.REQUESTER])(
    '%s puede cambiar su propia contraseña autenticada',
    async (role) => {
      currentUser = actor(role, { mustChangePassword: true })
      const response = await request(app.getHttpServer()).post('/api/v1/auth/change-password').send({
        currentPassword: 'Tf-A7k9!mQ2',
        newPassword: 'NuevaClave1!',
      })
      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Tu contraseña se actualizó correctamente.')
      expect(authService.changePassword).toHaveBeenCalledWith(currentUser.id, {
        currentPassword: 'Tf-A7k9!mQ2',
        newPassword: 'NuevaClave1!',
      })
    },
  )

  it('permite consultar la sesión mínima con cambio obligatorio', async () => {
    currentUser = actor(RoleCode.AGENT, { mustChangePassword: true })
    const response = await request(app.getHttpServer()).get('/api/v1/auth/me')
    expect(response.status).toBe(200)
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
