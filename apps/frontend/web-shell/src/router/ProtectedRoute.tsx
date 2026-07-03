import { Navigate, Outlet } from 'react-router-dom'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <LoadingSkeleton variant="profile" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
