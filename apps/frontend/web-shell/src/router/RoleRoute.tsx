'use client'

import { ForbiddenPage } from '@/views/errors/ForbiddenPage'
import { usePermissions } from '@/hooks/usePermissions'
import type { UserRole } from '@/types/user.types'

interface RoleRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
  permission?: string | string[]
  path?: string
}

export function RoleRoute({ children, roles, permission, path }: RoleRouteProps) {
  const { hasRole, hasPermission, canAccessRoute } = usePermissions()

  if (roles && !hasRole(roles)) {
    return <ForbiddenPage />
  }

  if (permission) {
    const required = Array.isArray(permission) ? permission : [permission]
    if (!required.some((code) => hasPermission(code))) {
      return <ForbiddenPage />
    }
  }

  if (path && !canAccessRoute(path)) {
    return <ForbiddenPage />
  }

  return <>{children}</>
}
