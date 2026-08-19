import { useRoutes } from 'react-router-dom'
import { PageLoader } from '@/components/common/PageLoader'
import { useAuth } from '@/hooks/useAuth'
import { routes } from '@/router/routes'

export function AppRouter() {
  const { isLoading } = useAuth()
  const element = useRoutes(routes)
  if (isLoading) return <PageLoader />
  return element
}
