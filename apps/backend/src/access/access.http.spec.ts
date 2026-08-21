import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ApiExceptionFilter } from '../common/api'
import { ROLE_PERMISSION_CODES } from '../common/permissions'
import { RoleCode, UserStatus } from '../database/entities'
import { MustChangePasswordGuard, PermissionsGuard } from '../auth/auth.guard'
import { ModulesController, PermissionsController, RolesController } from './access.controller'
import { AccessService } from './access.service'

const ROLE_ID = '11111111-1111-4111-8111-111111111111'
const PERMISSION_ID = '22222222-2222-4222-8222-222222222222'
const MODULE_ID = '33333333-3333-4333-8333-333333333333'

describe('HTTP roles y privilegios', () => {
  let app: INestApplication
  let currentUser: ReturnType<typeof actor>
  const access = {
    listRoles: jest.fn().mockResolvedValue([{ id: ROLE_ID, code: 'ADMIN', permissionsVersion: 1 }]),
    listPermissions: jest.fn().mockResolvedValue([{ id: PERMISSION_ID, code: 'TICKET_VIEW_OWN', module: { code: 'TICKETS' } }]),
    listModules: jest.fn().mockResolvedValue([{ id: MODULE_ID, code: 'TICKETS', isActive: true }]),
    getRolePermissions: jest.fn().mockResolvedValue({ role: { id: ROLE_ID, permissionsVersion: 1 }, modules: [] }),
    updateRolePermissions: jest.fn().mockResolvedValue({ role: { id: ROLE_ID, permissionsVersion: 2 }, modules: [] }),
    listRoleAudit: jest.fn().mockResolvedValue([]),
    listModuleAudit: jest.fn().mockResolvedValue([]),
    updateModuleStatus: jest.fn().mockResolvedValue({ id: MODULE_ID, isActive: false }),
  }

  beforeAll(async () => {
    class TestJwtGuard implements CanActivate {
      canActivate(context: ExecutionContext) {
        if (!currentUser) throw new UnauthorizedException('Token de acceso requerido')
        context.switchToHttp().getRequest().user = currentUser
        return true
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [RolesController, PermissionsController, ModulesController],
      providers: [
        { provide: AccessService, useValue: access },
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
    access.listRoles.mockResolvedValue([{ id: ROLE_ID, code: 'ADMIN', permissionsVersion: 1 }])
  })

  it('ADMIN con privilegio puede listar roles, módulos, permisos y consultar un rol', async () => {
    currentUser = actor(RoleCode.ADMIN)
    expect((await request(app.getHttpServer()).get('/api/v1/roles')).status).toBe(200)
    expect((await request(app.getHttpServer()).get('/api/v1/modules')).status).toBe(200)
    expect((await request(app.getHttpServer()).get('/api/v1/permissions?moduleCode=TICKETS')).status).toBe(200)
    expect((await request(app.getHttpServer()).get(`/api/v1/roles/${ROLE_ID}/permissions`)).status).toBe(200)
    expect((await request(app.getHttpServer()).get(`/api/v1/roles/${ROLE_ID}/permissions/audit`)).status).toBe(200)
  })

  it('permite modificar privilegios y el estado de un módulo configurable', async () => {
    currentUser = actor(RoleCode.ADMIN)
    const update = await request(app.getHttpServer()).put(`/api/v1/roles/${ROLE_ID}/permissions`).send({
      permissionIds: [PERMISSION_ID],
      expectedVersion: 1,
    })
    expect(update.status).toBe(200)
    expect(access.updateRolePermissions).toHaveBeenCalledWith(
      ROLE_ID,
      { permissionIds: [PERMISSION_ID], expectedVersion: 1 },
      currentUser,
    )

    const status = await request(app.getHttpServer()).patch(`/api/v1/modules/${MODULE_ID}/status`).send({ isActive: false })
    expect(status.status).toBe(200)
  })

  it('rechaza IDs inválidos y acceso sin privilegio', async () => {
    currentUser = actor(RoleCode.ADMIN)
    expect((await request(app.getHttpServer()).get('/api/v1/roles/no-es-uuid/permissions')).status).toBe(400)

    currentUser = actor(RoleCode.AGENT)
    expect((await request(app.getHttpServer()).get('/api/v1/roles')).status).toBe(403)
    expect(
      (await request(app.getHttpServer()).put(`/api/v1/roles/${ROLE_ID}/permissions`).send({ permissionIds: [PERMISSION_ID], expectedVersion: 1 })).status,
    ).toBe(403)
  })

  it('impide acceso sin autenticación', async () => {
    currentUser = undefined as never
    const response = await request(app.getHttpServer()).get('/api/v1/roles')
    expect(response.status).toBe(401)
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
