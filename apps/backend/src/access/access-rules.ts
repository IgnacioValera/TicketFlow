import { ConflictException } from '@nestjs/common'
import { ADMINISTRATION_MODULE_CODE, MODULE_MANAGE, ROLE_PERMISSION_MANAGE } from '../common/access-catalog'
import { AccessModule, Role, User, UserStatus } from '../database/entities'

export const AUDIT_ROLE_PERMISSIONS_UPDATE = 'ROLE_PERMISSIONS_UPDATE'
export const AUDIT_MODULE_ACTIVATE = 'MODULE_ACTIVATE'
export const AUDIT_MODULE_DEACTIVATE = 'MODULE_DEACTIVATE'
export const AUDIT_LOCKOUT_PREVENTED = 'LOCKOUT_PREVENTED'

export const LAST_ROLE_MANAGE_MESSAGE =
  'No se puede quitar el último privilegio para administrar roles y privilegios.'
export const LAST_SELF_ADMIN_MESSAGE =
  'No puedes quitarte a ti mismo el último acceso de administración.'
export const SYSTEM_MODULE_MESSAGE = 'Este módulo es esencial y no se puede desactivar.'
export const ADMINISTRATION_MODULE_MESSAGE =
  'No se puede desactivar el módulo de Administración porque dejaría al sistema sin forma de volver a habilitarlo.'
export const STALE_PERMISSIONS_VERSION_MESSAGE =
  'La configuración de privilegios cambió. Actualiza la página e inténtalo de nuevo.'
export const UNKNOWN_PERMISSIONS_MESSAGE = 'Uno o más permisos no existen.'
export const ROLE_NOT_FOUND_MESSAGE = 'El rol no existe.'
export const MODULE_NOT_FOUND_MESSAGE = 'El módulo no existe.'

export function uniqueIds(ids: string[]) {
  return [...new Set(ids)]
}

export function diffPermissionCodes(previous: string[], next: string[]) {
  const previousSet = new Set(previous)
  const nextSet = new Set(next)
  return {
    added: next.filter((code) => !previousSet.has(code)),
    removed: previous.filter((code) => !nextSet.has(code)),
  }
}

export function roleHasCode(role: Pick<Role, 'permissions'>, code: string) {
  return (role.permissions ?? []).some((permission) => permission.code === code)
}

export function assertCanAssignRolePermissions(input: {
  targetRole: Role
  nextCodes: string[]
  rolesWithManage: Array<{ id: string; permissions: Array<{ code: string }> }>
  activeUsersWithManage: Array<{ id: string; role: { id: string } }>
  actor: User
}) {
  const nextHasManage = input.nextCodes.includes(ROLE_PERMISSION_MANAGE)
  const currentlyHasManage = roleHasCode(input.targetRole, ROLE_PERMISSION_MANAGE)
  if (currentlyHasManage && !nextHasManage) {
    const otherRoles = input.rolesWithManage.filter((role) => role.id !== input.targetRole.id)
    if (otherRoles.length === 0) {
      throw new ConflictException(LAST_ROLE_MANAGE_MESSAGE)
    }
    const otherActiveUsers = input.activeUsersWithManage.filter(
      (user) => user.role.id !== input.targetRole.id && user.id !== input.actor.id,
    )
    if (input.actor.role.id === input.targetRole.id && otherActiveUsers.length === 0) {
      throw new ConflictException(LAST_SELF_ADMIN_MESSAGE)
    }
  }
}

export function assertCanDeactivateModule(module: AccessModule) {
  if (module.isSystem || module.code === ADMINISTRATION_MODULE_CODE) {
    throw new ConflictException(
      module.code === ADMINISTRATION_MODULE_CODE ? ADMINISTRATION_MODULE_MESSAGE : SYSTEM_MODULE_MESSAGE,
    )
  }
}

export function isActiveAdminUser(user: Pick<User, 'status'>) {
  return user.status === UserStatus.ACTIVE
}
