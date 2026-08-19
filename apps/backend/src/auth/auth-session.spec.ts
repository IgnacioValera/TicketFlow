import { Controller, Get, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ApiExceptionFilter, result } from '../common/api'
import { ROLE_PERMISSION_CODES } from '../common/permissions'
import { RoleCode, UserStatus } from '../database/entities'
import { AuthService } from './auth.service'
import { JwtAuthGuard, MustChangePasswordGuard, PermissionsGuard } from './auth.guard'

@Controller('tickets')
class TicketsProbeController {
  @Get() list() {
    return result(['ok'])
  }
}

describe('Sesiones vigentes tras reset o desactivación', () => {
  let app: INestApplication
  let dbUser: ReturnType<typeof agentRecord> | null
  const jwt = {
    verifyAsync: jest.fn(),
  }
  const auth = {
    validateUser: jest.fn(async (id: string) => {
      if (!dbUser || dbUser.id !== id || dbUser.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Sesión inválida')
      }
      return dbUser
    }),
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsProbeController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-access-secret' } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: MustChangePasswordGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    app.useGlobalFilters(new ApiExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    dbUser = agentRecord()
    jwt.verifyAsync.mockResolvedValue({
      sub: dbUser.id,
      type: 'access',
      role: RoleCode.AGENT,
      mustChangePassword: false,
    })
    auth.validateUser.mockClear()
  })

  it('un access token emitido antes del reset no consulta tickets: recarga mustChangePassword desde la base', async () => {
    const first = await request(app.getHttpServer())
      .get('/api/v1/tickets')
      .set('Authorization', 'Bearer stale-access-token')
    expect(first.status).toBe(200)

    dbUser = { ...agentRecord(), mustChangePassword: true }

    const second = await request(app.getHttpServer())
      .get('/api/v1/tickets')
      .set('Authorization', 'Bearer stale-access-token')

    expect(second.status).toBe(403)
    expect(second.body.code).toBe('PASSWORD_CHANGE_REQUIRED')
    expect(second.body.message).toBe('Debes cambiar tu contraseña temporal antes de continuar.')
    expect(jwt.verifyAsync).toHaveBeenCalled()
    expect(auth.validateUser).toHaveBeenCalledWith('agent-1')
  })

  it('no confía en mustChangePassword=false del JWT si la base ya exige el cambio', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'agent-1',
      type: 'access',
      mustChangePassword: false,
    })
    dbUser = { ...agentRecord(), mustChangePassword: true }

    const response = await request(app.getHttpServer())
      .get('/api/v1/tickets')
      .set('Authorization', 'Bearer stale-access-token')

    expect(response.status).not.toBe(200)
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('PASSWORD_CHANGE_REQUIRED')
  })

  it('un access token emitido antes de desactivar deja de acceder a endpoints protegidos', async () => {
    const first = await request(app.getHttpServer())
      .get('/api/v1/tickets')
      .set('Authorization', 'Bearer stale-access-token')
    expect(first.status).toBe(200)

    dbUser = { ...agentRecord(), status: UserStatus.INACTIVE }

    const second = await request(app.getHttpServer())
      .get('/api/v1/tickets')
      .set('Authorization', 'Bearer stale-access-token')

    expect(second.status).toBe(401)
    expect(second.body.message).toBe('Sesión inválida')
  })
})

function agentRecord() {
  return {
    id: 'agent-1',
    fullName: 'Agente Soporte',
    email: 'agent@helpdesk.com',
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    role: {
      code: RoleCode.AGENT,
      permissions: ROLE_PERMISSION_CODES.AGENT.map((code) => ({ code })),
    },
  }
}
