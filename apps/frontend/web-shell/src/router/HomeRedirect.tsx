import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getHomePath } from '@/utils/session-gate'

export function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={getHomePath(user)} replace />
}
