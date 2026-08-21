import { AccessModule, Permission, User } from '../database/entities'

export function isPermissionActive(permission: Pick<Permission, 'code'> & { module?: Pick<AccessModule, 'isActive'> | null }) {
  if (!permission.module) return true
  return permission.module.isActive !== false
}

export function effectivePermissionCodes(
  permissions: Array<Pick<Permission, 'code'> & { module?: Pick<AccessModule, 'isActive'> | null }> | undefined,
): string[] {
  return [...new Set((permissions ?? []).filter(isPermissionActive).map((permission) => permission.code))]
}

export function userPermissionCodes(user: Pick<User, 'role'>): string[] {
  return effectivePermissionCodes(user.role?.permissions)
}

export function hasEffectivePermission(user: Pick<User, 'role'>, code: string) {
  return userPermissionCodes(user).includes(code)
}
