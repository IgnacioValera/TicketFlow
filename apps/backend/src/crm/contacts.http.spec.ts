import { CanActivate, ExecutionContext, INestApplication, NotFoundException, UnauthorizedException, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ApiExceptionFilter } from '../common/api'
import { ROLE_PERMISSION_CODES } from '../common/permissions'
import { RoleCode, UserStatus } from '../database/entities'
import { MustChangePasswordGuard, PermissionsGuard } from '../auth/auth.guard'
import { ContactsController } from './crm.controller'
import { ContactsService } from './contacts.service'

const CONTACT_ID = '11111111-1111-4111-8111-111111111111'

describe('HTTP contactos CRM', () => {
  let app: INestApplication
  let currentUser: ReturnType<typeof actor> | null
  const contacts = {
    list: jest.fn(),
    exportCsv: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue({ id: CONTACT_ID, firstName: 'Ana', lastName: 'Pérez' }),
    remove: jest.fn().mockResolvedValue({ id: CONTACT_ID }),
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
      controllers: [ContactsController],
      providers: [
        { provide: ContactsService, useValue: contacts },
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
    contacts.update.mockResolvedValue({ id: CONTACT_ID, firstName: 'Ana', lastName: 'Pérez' })
    contacts.remove.mockResolvedValue({ id: CONTACT_ID })
  })

  it('ADMIN con privilegio puede editar y eliminar un contacto', async () => {
    currentUser = actor(RoleCode.ADMIN)
    const updated = await request(app.getHttpServer()).put(`/api/v1/crm/contacts/${CONTACT_ID}`).send({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@acme.test',
    })
    expect(updated.status).toBe(200)
    expect(contacts.update).toHaveBeenCalled()

    const removed = await request(app.getHttpServer()).delete(`/api/v1/crm/contacts/${CONTACT_ID}`)
    expect(removed.status).toBe(200)
    expect(contacts.remove).toHaveBeenCalledWith(CONTACT_ID, expect.anything())
  })

  it('rechaza UUID inválido', async () => {
    currentUser = actor(RoleCode.ADMIN)
    expect((await request(app.getHttpServer()).put('/api/v1/crm/contacts/no-uuid').send({ firstName: 'Ana' })).status).toBe(400)
    expect((await request(app.getHttpServer()).delete('/api/v1/crm/contacts/no-uuid')).status).toBe(400)
  })

  it('devuelve 404 si el contacto no existe', async () => {
    currentUser = actor(RoleCode.ADMIN)
    contacts.update.mockRejectedValue(new NotFoundException('Contacto no encontrado'))
    contacts.remove.mockRejectedValue(new NotFoundException('Contacto no encontrado'))
    expect((await request(app.getHttpServer()).put(`/api/v1/crm/contacts/${CONTACT_ID}`).send({ firstName: 'Ana' })).status).toBe(404)
    expect((await request(app.getHttpServer()).delete(`/api/v1/crm/contacts/${CONTACT_ID}`)).status).toBe(404)
  })

  it('exige autenticación', async () => {
    currentUser = null
    expect((await request(app.getHttpServer()).put(`/api/v1/crm/contacts/${CONTACT_ID}`).send({ firstName: 'Ana' })).status).toBe(401)
    expect((await request(app.getHttpServer()).delete(`/api/v1/crm/contacts/${CONTACT_ID}`)).status).toBe(401)
  })

  it('AGENT no puede editar ni eliminar por privilegio dinámico', async () => {
    currentUser = actor(RoleCode.AGENT)
    expect((await request(app.getHttpServer()).put(`/api/v1/crm/contacts/${CONTACT_ID}`).send({ firstName: 'Ana' })).status).toBe(403)
    expect((await request(app.getHttpServer()).delete(`/api/v1/crm/contacts/${CONTACT_ID}`)).status).toBe(403)
    expect(contacts.update).not.toHaveBeenCalled()
    expect(contacts.remove).not.toHaveBeenCalled()
  })

  it('exige CRM_CONTACT_DELETE aunque el rol tenga edición', async () => {
    currentUser = actor(RoleCode.ADMIN)
    currentUser.role.permissions = currentUser.role.permissions.filter((item) => item.code !== 'CRM_CONTACT_DELETE')
    expect((await request(app.getHttpServer()).delete(`/api/v1/crm/contacts/${CONTACT_ID}`)).status).toBe(403)
    expect((await request(app.getHttpServer()).put(`/api/v1/crm/contacts/${CONTACT_ID}`).send({ firstName: 'Ana' })).status).toBe(200)
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
