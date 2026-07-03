import { useRoutes } from 'react-router-dom'
import { routes } from '@/router/routes'

export function AppRouter() {
  return useRoutes(routes)
}
