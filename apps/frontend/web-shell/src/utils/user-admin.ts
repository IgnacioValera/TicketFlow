import type { UserRole, UserStatus } from '@/types/user.types'

export const MANAGED_USER_ROLES: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'REQUESTER']

export const USER_SENSITIVE_KEYS = ['password', 'passwordHash', 'password_hash', 'temporaryPassword'] as const

export function canAdministerUsers(role: UserRole) {
  return role === 'ADMIN'
}

export function canResetUserPassword(actorRole: UserRole, status: UserStatus) {
  return actorRole === 'ADMIN' && status === 'ACTIVE'
}

export function roleOptionsForUser(currentRole: UserRole) {
  if (MANAGED_USER_ROLES.includes(currentRole)) return MANAGED_USER_ROLES
  return [currentRole, ...MANAGED_USER_ROLES]
}

export function hasSensitiveUserFields(payload: unknown) {
  if (!payload || typeof payload !== 'object') return false
  return USER_SENSITIVE_KEYS.some((key) => key in payload)
}

export function shouldRedirectPasswordChange(pathname: string, code?: string | null, mustChangePassword?: boolean) {
  if (pathname === '/change-password') return false
  return code === 'PASSWORD_CHANGE_REQUIRED' || Boolean(mustChangePassword)
}
