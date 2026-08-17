import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'CLIENT' || user.role === 'REQUESTER') return <Navigate to="/tickets" replace />
  if (user.role === 'SALES') return <Navigate to="/crm/dashboard" replace />
  return <Navigate to="/dashboard" replace />
}
