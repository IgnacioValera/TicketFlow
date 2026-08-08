import { Navigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import type { UserRole } from '@/types/user.types'

interface RoleRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
  permission?: string
  path?: string
}

export function RoleRoute({ children, roles, permission, path }: RoleRouteProps) {
  const { hasRole, hasPermission, canAccessRoute } = usePermissions()

  if (roles && !hasRole(roles)) {
    return <Navigate to="/forbidden" replace />
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/forbidden" replace />
  }

  if (path && !canAccessRoute(path)) {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
