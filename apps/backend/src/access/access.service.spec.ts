import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { PERMISSIONS } from '../common/permissions'
import { AccessModule, Permission, PermissionAudit, Role, RoleCode, User, UserStatus } from '../database/entities'
import { AccessService } from './access.service'
import { LAST_ROLE_MANAGE_MESSAGE, STALE_PERMISSIONS_VERSION_MESSAGE, UNKNOWN_PERMISSIONS_MESSAGE } from './access-rules'

const ADMIN_ROLE_ID = '11111111-1111-4111-8111-111111111111'
const AGENT_ROLE_ID = '22222222-2222-4222-8222-222222222222'
const MANAGE_ID = '33333333-3333-4333-8333-333333333333'
const VIEW_ID = '44444444-4444-4444-8444-444444444444'
const MISSING_ID = '55555555-5555-4555-8555-555555555555'
const TICKETS_MODULE_ID = '66666666-6666-4666-8666-666666666666'
const ADMIN_MODULE_ID = '77777777-7777-4777-8777-777777777777'

function permission(id: string, code: string, module?: Partial<AccessModule>) {
  return {
    id,
    code,
    name: code,
    description: '',
    action: 'VIEW',
    module: module ? ({ id: module.id ?? TICKETS_MODULE_ID, code: module.code ?? 'TICKETS', isActive: module.isActive ?? true, isSystem: false, name: 'Tickets', sortOrder: 1 } as AccessModule) : null,
  } as Permission
}

function adminRole(overrides: Partial<Role> = {}): Role {
  return {
    id: ADMIN_ROLE_ID,
    code: RoleCode.ADMIN,
    name: 'Administrador',
    description: 'Acceso completo',
    permissionsVersion: 3,
    permissions: [permission(MANAGE_ID, PERMISSIONS.ROLE_PERMISSION_MANAGE), permission(VIEW_ID, PERMISSIONS.TICKET_VIEW_OWN)],
    ...overrides,
  } as Role
}

describe('AccessService privilegios dinámicos', () => {
  const roles = { createQueryBuilder: jest.fn(), findOne: jest.fn(), find: jest.fn() }
  const permissions = { createQueryBuilder: jest.fn(), find: jest.fn() }
  const modules = { find: jest.fn() }
  const audits = { find: jest.fn(), save: jest.fn(), create: jest.fn((value) => value) }
  const dataSource = { transaction: jest.fn() }
  let service: AccessService
  let saved: unknown[]

  beforeEach(async () => {
    jest.clearAllMocks()
    saved = []
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: getRepositoryToken(Role), useValue: roles },
        { provide: getRepositoryToken(Permission), useValue: permissions },
        { provide: getRepositoryToken(AccessModule), useValue: modules },
        { provide: getRepositoryToken(PermissionAudit), useValue: audits },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile()
    service = moduleRef.get(AccessService)
  })

  function actor(): User {
    return {
      id: 'actor-1',
      fullName: 'Admin Sistema',
      email: 'admin@helpdesk.com',
      status: UserStatus.ACTIVE,
      role: adminRole(),
    } as User
  }

  function mockTransaction(roleState: Role, catalog: Permission[], allRoles: Role[], users: User[]) {
    const manager = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(roleState),
      })),
      findOne: jest.fn().mockResolvedValue(roleState),
      find: jest.fn(async (entity: unknown) => {
        if (entity === Permission) return catalog
        if (entity === Role) return allRoles
        if (entity === User) return users
        return []
      }),
      save: jest.fn(async (item: unknown) => {
        saved.push(item)
        return item
      }),
      create: jest.fn((_entity: unknown, item?: unknown) => item ?? _entity),
    }
    dataSource.transaction.mockImplementation(async (fn: (m: typeof manager) => Promise<unknown>) => fn(manager))
    roles.findOne.mockResolvedValue(roleState)
    modules.find.mockResolvedValue([
      {
        id: TICKETS_MODULE_ID,
        code: 'TICKETS',
        name: 'Tickets',
        description: '',
        isActive: true,
        isSystem: false,
        sortOrder: 20,
        permissions: catalog,
      },
    ])
    return manager
  }

  it('lista roles con conteos y versión', async () => {
    roles.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { id: ADMIN_ROLE_ID, code: 'ADMIN', name: 'Administrador', description: 'Admin', permissionsVersion: '3', userCount: '2', permissionCount: '40' },
      ]),
    })
    await expect(service.listRoles()).resolves.toEqual([
      { id: ADMIN_ROLE_ID, code: 'ADMIN', name: 'Administrador', description: 'Admin', userCount: 2, permissionCount: 40, permissionsVersion: 3 },
    ])
  })

  it('lista módulos y permisos con su módulo asociado', async () => {
    modules.find.mockResolvedValue([{ id: TICKETS_MODULE_ID, code: 'TICKETS', name: 'Tickets', description: '', isActive: true, isSystem: false, sortOrder: 20 }])
    permissions.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        permission(VIEW_ID, PERMISSIONS.TICKET_VIEW_OWN, { id: TICKETS_MODULE_ID, isActive: true }),
      ]),
    })
    await expect(service.listModules()).resolves.toEqual([
      expect.objectContaining({ id: TICKETS_MODULE_ID, code: 'TICKETS', isActive: true }),
    ])
    const listed = await service.listPermissions({})
    expect(listed[0]).toMatchObject({
      code: PERMISSIONS.TICKET_VIEW_OWN,
      module: expect.objectContaining({ code: 'TICKETS' }),
    })
  })

  it('consulta los privilegios de un rol agrupados por módulo', async () => {
    roles.findOne.mockResolvedValue(adminRole())
    modules.find.mockResolvedValue([
      {
        id: TICKETS_MODULE_ID,
        code: 'TICKETS',
        name: 'Tickets',
        description: '',
        isActive: true,
        isSystem: false,
        sortOrder: 20,
        permissions: [permission(VIEW_ID, PERMISSIONS.TICKET_VIEW_OWN), permission(MANAGE_ID, PERMISSIONS.ROLE_PERMISSION_MANAGE)],
      },
    ])
    const result = await service.getRolePermissions(ADMIN_ROLE_ID)
    expect(result.role.permissionsVersion).toBe(3)
    expect(result.modules[0].permissions.find((item) => item.id === VIEW_ID)?.assigned).toBe(true)
  })

  it('modifica permisos, persiste la relación, incrementa la versión y registra al actor', async () => {
    const current = adminRole()
    const selected = [permission(MANAGE_ID, PERMISSIONS.ROLE_PERMISSION_MANAGE), permission(VIEW_ID, PERMISSIONS.TICKET_VIEW_OWN)]
    mockTransaction(current, selected, [current], [actor()])
    const updated = adminRole({ permissionsVersion: 4, permissions: selected })
    roles.findOne.mockResolvedValue(updated)

    const result = await service.updateRolePermissions(
      ADMIN_ROLE_ID,
      { permissionIds: [MANAGE_ID, VIEW_ID, VIEW_ID], expectedVersion: 3 },
      actor(),
    )

    expect(saved.some((item) => (item as Role).permissionsVersion === 4)).toBe(true)
    expect(saved.some((item) => (item as PermissionAudit).action === 'ROLE_PERMISSIONS_UPDATE' && (item as PermissionAudit).actor?.id === 'actor-1')).toBe(true)
    expect(result.role.permissionsVersion).toBe(4)
  })

  it('rechaza permisos inexistentes y versiones desactualizadas', async () => {
    const current = adminRole({ permissionsVersion: 3 })
    mockTransaction(current, [permission(VIEW_ID, PERMISSIONS.TICKET_VIEW_OWN)], [current], [actor()])
    await expect(
      service.updateRolePermissions(ADMIN_ROLE_ID, { permissionIds: [VIEW_ID, MISSING_ID], expectedVersion: 3 }, actor()),
    ).rejects.toBeInstanceOf(NotFoundException)

    mockTransaction(adminRole({ permissionsVersion: 4 }), [], [adminRole()], [actor()])
    await expect(
      service.updateRolePermissions(ADMIN_ROLE_ID, { permissionIds: [VIEW_ID], expectedVersion: 3 }, actor()),
    ).rejects.toMatchObject({ constructor: ConflictException, message: STALE_PERMISSIONS_VERSION_MESSAGE })
  })

  it('impide eliminar el último administrador funcional y registra el intento', async () => {
    const current = adminRole()
    mockTransaction(
      current,
      [permission(VIEW_ID, PERMISSIONS.TICKET_VIEW_OWN)],
      [current],
      [actor()],
    )
    await expect(
      service.updateRolePermissions(ADMIN_ROLE_ID, { permissionIds: [VIEW_ID], expectedVersion: 3 }, actor()),
    ).rejects.toMatchObject({ message: LAST_ROLE_MANAGE_MESSAGE })
    expect(audits.save).toHaveBeenCalled()
  })

  it('desactiva un módulo configurable y rechaza uno esencial', async () => {
    const tickets = { id: TICKETS_MODULE_ID, code: 'TICKETS', name: 'Tickets', description: '', isActive: true, isSystem: false, sortOrder: 20 } as AccessModule
    const administration = { id: ADMIN_MODULE_ID, code: 'ADMINISTRATION', name: 'Administración', description: '', isActive: true, isSystem: true, sortOrder: 200 } as AccessModule
    dataSource.transaction.mockImplementation(async (fn: (m: { createQueryBuilder: jest.Mock; save: jest.Mock; create: jest.Mock }) => Promise<unknown>) => {
      const moduleState = { ...tickets }
      const manager = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(moduleState),
        })),
        save: jest.fn(async (item: AccessModule) => item),
        create: jest.fn((_entity: unknown, item?: unknown) => item ?? _entity),
      }
      return fn(manager)
    })
    await expect(service.updateModuleStatus(TICKETS_MODULE_ID, { isActive: false }, actor())).resolves.toMatchObject({
      isActive: false,
      code: 'TICKETS',
    })

    dataSource.transaction.mockImplementation(async (fn: (m: { createQueryBuilder: jest.Mock; save: jest.Mock; create: jest.Mock }) => Promise<unknown>) => {
      const manager = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...administration }),
        })),
        save: jest.fn(),
        create: jest.fn((_entity: unknown, item?: unknown) => item ?? _entity),
      }
      return fn(manager)
    })
    await expect(service.updateModuleStatus(ADMIN_MODULE_ID, { isActive: false }, actor())).rejects.toThrow(/Administración/)
  })

  it('expone el mensaje de permiso inexistente en español', () => {
    expect(UNKNOWN_PERMISSIONS_MESSAGE).toBe('Uno o más permisos no existen.')
  })
})
