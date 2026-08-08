import { apiGet } from '@/services/apiClient'
import type {
  ReportDateRangeParams,
  SlaComplianceSummary,
  TicketsByAgentItem,
  TicketsByCategoryItem,
  TicketsByCompanyItem,
  TicketsByStatusItem,
} from '@/types/report.types'

export async function getTicketsByStatus() {
  const response = await apiGet<TicketsByStatusItem[]>('/reports/tickets-by-status')
  return response.data
}

export async function getTicketsByAgent() {
  const response = await apiGet<TicketsByAgentItem[]>('/reports/tickets-by-agent')
  return response.data
}

export async function getTicketsByCategory() {
  const response = await apiGet<TicketsByCategoryItem[]>('/reports/tickets-by-category')
  return response.data
}

export async function getSlaCompliance(params: ReportDateRangeParams = {}) {
  const response = await apiGet<SlaComplianceSummary>(
    '/reports/sla-compliance',
    params as Record<string, unknown>,
  )
  return response.data
}

export async function getTicketsByCompany() {
  const response = await apiGet<TicketsByCompanyItem[]>('/reports/tickets-by-company')
  return response.data
}
