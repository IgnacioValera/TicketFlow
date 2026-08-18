import { apiGet } from '@/services/apiClient'
import * as ticketService from '@/services/ticket.service'
import type {
  ReportDateRangeParams,
  SatisfactionSummary,
  SlaComplianceSummary,
  TicketsByAgentItem,
  TicketsByCategoryItem,
  TicketsByCompanyItem,
  TicketsByStatusItem,
} from '@/types/report.types'
import type { Ticket } from '@/types/ticket.types'
import { filterTicketsByCreatedRange } from '@/utils/reports'

function query(params: ReportDateRangeParams = {}) {
  return params as Record<string, unknown>
}

export async function getTicketsForReport(params: ReportDateRangeParams = {}) {
  const first = await ticketService.getTickets({ page: 1, perPage: 100 })
  const tickets: Ticket[] = [...first.data]
  const totalPages = first.meta?.totalPages ?? 1
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await ticketService.getTickets({ page, perPage: 100 })
    tickets.push(...next.data)
  }
  return filterTicketsByCreatedRange(tickets, params)
}

export async function getTicketsByStatus(params: ReportDateRangeParams = {}) {
  const response = await apiGet<TicketsByStatusItem[]>('/reports/tickets-by-status', query(params))
  return response.data
}

export async function getTicketsByAgent(params: ReportDateRangeParams = {}) {
  const response = await apiGet<TicketsByAgentItem[]>('/reports/tickets-by-agent', query(params))
  return response.data
}

export async function getTicketsByCategory(params: ReportDateRangeParams = {}) {
  const response = await apiGet<TicketsByCategoryItem[]>('/reports/tickets-by-category', query(params))
  return response.data
}

export async function getSlaCompliance(params: ReportDateRangeParams = {}) {
  const response = await apiGet<SlaComplianceSummary>('/reports/sla-compliance', query(params))
  return response.data
}

export async function getTicketsByCompany(params: ReportDateRangeParams = {}) {
  const response = await apiGet<TicketsByCompanyItem[]>('/reports/tickets-by-company', query(params))
  return response.data
}

export async function getSatisfaction(params: ReportDateRangeParams = {}) {
  const response = await apiGet<SatisfactionSummary>('/reports/satisfaction', query(params))
  return response.data
}
