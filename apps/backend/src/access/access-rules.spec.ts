import { ConflictException } from '@nestjs/common'
import { RoleCode, UserStatus } from '../database/entities'
import { PERMISSIONS } from '../common/permissions'
import {
  LAST_ROLE_MANAGE_MESSAGE,
  LAST_SELF_ADMIN_MESSAGE,
  ADMINISTRATION_MODULE_MESSAGE,
  SYSTEM_MODULE_MESSAGE,
  STALE_PERMISSIONS_VERSION_MESSAGE,
  assertCanAssignRolePermissions,
  assertCanDeactivateModule,
  diffPermissionCodes,
  uniqueIds,
} from './access-rules'
import { PERMISSION_DEFINITIONS, nextRolePermissionCodes } from '../common/access-catalog'
import { effectivePermissionCodes } from '../common/effective-permissions'

describe('Reglas de privilegios', () => {
  const manage = { code: PERMISSIONS.ROLE_PERMISSION_MANAGE }
  const view = { code: PERMISSIONS.TICKET_VIEW_OWN }

  function role(id: string, permissions: Array<{ code: string }>) {
    return { id, permissions } as never
  }

  function actor(roleId: string, id = 'actor-1') {
    return {
      id,
      status: UserStatus.ACTIVE,
      role: { id: roleId, code: RoleCode.ADMIN, permissions: [manage] },
    } as never
  }

  it('calcula permisos agregados y eliminados', () => {
    expect(diffPermissionCodes(['A', 'B'], ['B', 'C'])).toEqual({ added: ['C'], removed: ['A'] })
  })

  it('elimina duplicados de identificadores', () => {
    expect(uniqueIds(['a', 'a', 'b'])).toEqual(['a', 'b'])
  })

  it('impide quitar ROLE_PERMISSION_MANAGE del último rol que lo tiene', () => {
    expect(() =>
      assertCanAssignRolePermissions({
        targetRole: role('admin-role', [manage, view]),
        nextCodes: [view.code],
        rolesWithManage: [role('admin-role', [manage])],
        activeUsersWithManage: [{ id: 'actor-1', role: { id: 'admin-role' } }],
        actor: actor('admin-role'),
      }),
    ).toThrow(LAST_ROLE_MANAGE_MESSAGE)
  })

  it('impide que un usuario se quite a sí mismo el último acceso administrativo', () => {
    expect(() =>
      assertCanAssignRolePermissions({
        targetRole: role('admin-role', [manage]),
        nextCodes: [view.code],
        rolesWithManage: [role('admin-role', [manage]), role('other-role', [manage])],
        activeUsersWithManage: [{ id: 'actor-1', role: { id: 'admin-role' } }],
        actor: actor('admin-role'),
      }),
    ).toThrow(LAST_SELF_ADMIN_MESSAGE)
  })

  it('permite quitar el privilegio si otro rol y otro usuario activo lo conservan', () => {
    expect(() =>
      assertCanAssignRolePermissions({
        targetRole: role('sales-role', [manage, view]),
        nextCodes: [view.code],
        rolesWithManage: [role('sales-role', [manage]), role('admin-role', [manage])],
        activeUsersWithManage: [
          { id: 'actor-1', role: { id: 'sales-role' } },
          { id: 'admin-1', role: { id: 'admin-role' } },
        ],
        actor: actor('sales-role'),
      }),
    ).not.toThrow()
  })

  it('impide desactivar el módulo de Administración', () => {
    expect(() =>
      assertCanDeactivateModule({ code: 'ADMINISTRATION', isSystem: true } as never),
    ).toThrow(ADMINISTRATION_MODULE_MESSAGE)
  })

  it('impide desactivar un módulo de sistema', () => {
    expect(() => assertCanDeactivateModule({ code: 'TICKETS', isSystem: true } as never)).toThrow(SYSTEM_MODULE_MESSAGE)
  })

  it('conserva personalizaciones al repetir el seed', () => {
    expect(
      nextRolePermissionCodes({
        isNewRole: false,
        existingCodes: [PERMISSIONS.LOGIN, PERMISSIONS.TICKET_VIEW_OWN],
        defaultCodes: [PERMISSIONS.LOGIN, PERMISSIONS.TICKET_VIEW_OWN, PERMISSIONS.TICKET_VIEW_ALL],
        newlyCreatedCodes: [],
      }),
    ).toBeNull()
  })

  it('asigna defaults sólo a un rol nuevo o vacío', () => {
    expect(
      nextRolePermissionCodes({
        isNewRole: true,
        existingCodes: [],
        defaultCodes: [PERMISSIONS.LOGIN],
        newlyCreatedCodes: [],
      }),
    ).toEqual([PERMISSIONS.LOGIN])
    expect(
      nextRolePermissionCodes({
        isNewRole: false,
        existingCodes: [],
        defaultCodes: [PERMISSIONS.LOGIN, PERMISSIONS.TICKET_CREATE],
        newlyCreatedCodes: [],
      }),
    ).toEqual([PERMISSIONS.LOGIN, PERMISSIONS.TICKET_CREATE])
  })

  it('agrega permisos de catálogo nuevos sin restaurar los que el administrador quitó', () => {
    expect(
      nextRolePermissionCodes({
        isNewRole: false,
        existingCodes: [PERMISSIONS.LOGIN, PERMISSIONS.TICKET_VIEW_OWN],
        defaultCodes: [PERMISSIONS.LOGIN, PERMISSIONS.TICKET_VIEW_OWN, PERMISSIONS.TICKET_VIEW_ALL, PERMISSIONS.ROLE_VIEW],
        newlyCreatedCodes: [PERMISSIONS.ROLE_VIEW],
      }),
    ).toEqual([PERMISSIONS.LOGIN, PERMISSIONS.TICKET_VIEW_OWN, PERMISSIONS.ROLE_VIEW])
  })

  it('no autoriza permisos de un módulo inactivo', () => {
    expect(
      effectivePermissionCodes([
        { code: 'TICKET_VIEW_ALL', module: { isActive: false } },
        { code: 'TICKET_VIEW_OWN', module: { isActive: true } },
      ]),
    ).toEqual(['TICKET_VIEW_OWN'])
  })

  it('mapea todos los códigos de permiso a un módulo', () => {
    const defined = new Set(PERMISSION_DEFINITIONS.map((item) => item.code))
    expect([...Object.values(PERMISSIONS)].sort()).toEqual([...defined].sort())
  })

  it('conserva el mensaje de versión desactualizada', () => {
    expect(STALE_PERMISSIONS_VERSION_MESSAGE).toMatch(/cambió/)
    expect(new ConflictException(STALE_PERMISSIONS_VERSION_MESSAGE).getStatus()).toBe(409)
  })
})
