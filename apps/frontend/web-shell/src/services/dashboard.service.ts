import { apiGet } from '@/services/apiClient'
import type { DashboardSummary } from '@/types/dashboard.types'

export async function getDashboardSummary(scope?: 'GLOBAL' | 'OWN') {
  const response = await apiGet<DashboardSummary>('/dashboard/summary', {
    ...(scope ? { scope } : {}),
  })
  return response.data
}
