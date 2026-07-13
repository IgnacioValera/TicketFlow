import { useCallback, useMemo } from 'react'
import { ROUTE_PERMISSIONS } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/user.types'

export function usePermissions() {
  const { user } = useAuth()

  const permissions = useMemo(() => user?.permissions ?? [], [user])

  const hasPermission = useCallback((code: string) => permissions.includes(code), [permissions])

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!user) return false
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes(user.role)
    },
    [user],
  )

  const canAccessRoute = useCallback(
    (path: string) => {
      if (!user) return false

      const basePath = path.split('/').slice(0, 2).join('/') || path
      const required = ROUTE_PERMISSIONS[basePath] ?? ROUTE_PERMISSIONS[path]

      if (!required) return true
      return required.some((permission) => permissions.includes(permission))
    },
    [permissions, user],
  )

  return {
    permissions,
    hasPermission,
    hasRole,
    canAccessRoute,
    role: user?.role ?? null,
  }
}
