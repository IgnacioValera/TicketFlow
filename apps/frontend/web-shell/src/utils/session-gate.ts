import type { User, UserRole } from '@/types/user.types'

export type SessionGate = 'loader' | 'login' | 'change-password' | 'home' | 'content'

export function getHomePath(user?: Pick<User, 'role' | 'mustChangePassword'> | null) {
  if (!user) return '/login'
  if (user.mustChangePassword) return '/change-password'
  if (user.role === 'CLIENT' || user.role === 'REQUESTER') return '/tickets'
  if (user.role === 'SALES') return '/crm/dashboard'
  return '/dashboard'
}

export function resolveSessionGate(input: {
  isLoading: boolean
  isAuthenticated: boolean
  mustChangePassword?: boolean
  pathname: string
}): SessionGate {
  if (input.isLoading) return 'loader'
  if (!input.isAuthenticated) return 'login'
  if (input.mustChangePassword && input.pathname !== '/change-password') return 'change-password'
  if (!input.mustChangePassword && input.pathname === '/change-password') return 'home'
  return 'content'
}

export function canUseHistoryBack(locationKey?: string) {
  return Boolean(locationKey && locationKey !== 'default')
}

export type ContentStatus = 'loading' | 'error' | 'empty' | 'ready'

export function resolveContentStatus(input: {
  loading: boolean
  error?: string | null
  itemCount: number
}): ContentStatus {
  if (input.error && input.itemCount === 0 && !input.loading) return 'error'
  if (input.loading && input.itemCount === 0) return 'loading'
  if (!input.loading && !input.error && input.itemCount === 0) return 'empty'
  return 'ready'
}

export const READABLE_ROLES: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  AGENT: 'Agente',
  REQUESTER: 'Solicitante',
  SALES: 'Ejecutivo comercial',
  CLIENT: 'Cliente portal',
}

export const LOADER_STATUS_PROPS = {
  role: 'status' as const,
  'aria-live': 'polite' as const,
}
