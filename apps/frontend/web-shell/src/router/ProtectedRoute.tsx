import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <LoadingSkeleton variant="profile" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (!user?.mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
