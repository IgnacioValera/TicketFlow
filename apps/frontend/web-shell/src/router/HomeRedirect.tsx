import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'REQUESTER') return <Navigate to="/tickets" replace />
  return <Navigate to="/dashboard" replace />
}
