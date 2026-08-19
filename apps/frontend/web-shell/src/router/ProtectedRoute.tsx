import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/common/PageLoader'
import { useAuth } from '@/hooks/useAuth'
import { getHomePath, resolveSessionGate } from '@/utils/session-gate'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()
  const gate = resolveSessionGate({
    isLoading,
    isAuthenticated,
    mustChangePassword: user?.mustChangePassword,
    pathname: location.pathname,
  })

  if (gate === 'loader') return <PageLoader />
  if (gate === 'login') return <Navigate to="/login" replace state={{ from: location }} />
  if (gate === 'change-password') return <Navigate to="/change-password" replace />
  if (gate === 'home') return <Navigate to={getHomePath(user)} replace />

  return <Outlet />
}
