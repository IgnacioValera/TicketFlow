import type { Ticket, TicketStatus } from '@/types/ticket.types'
import type {
  ReportDateRangeParams,
  SatisfactionSummary,
  SlaComplianceSummary,
  TicketsByAgentItem,
  TicketsByCategoryItem,
  TicketsByCompanyItem,
  TicketsByStatusItem,
} from '@/types/report.types'
import { validateDateRange } from '@/utils/validation'

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En proceso',
  WAITING_USER: 'En espera',
  ESCALATED: 'Escalado',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
}

const OPEN_STATUSES: TicketStatus[] = ['OPEN', 'ASSIGNED']
const IN_PROGRESS_STATUSES: TicketStatus[] = ['IN_PROGRESS']
const RESOLVED_STATUSES: TicketStatus[] = ['RESOLVED', 'CLOSED']
const CLOSED_STATUSES: TicketStatus[] = ['CLOSED', 'CANCELLED']

export interface CompanyReportMeta {
  industry?: string
  region?: string
}

export function ticketStatusLabel(status: string) {
  return TICKET_STATUS_LABELS[status as TicketStatus] ?? status
}

export function isIsoInInclusiveRange(iso: string | null | undefined, start?: string, end?: string) {
  if (!iso) return false
  const day = iso.slice(0, 10)
  if (start && day < start) return false
  if (end && day > end) return false
  return true
}

export function canRequestDateRange(startDate: string, endDate: string): string | null {
  return validateDateRange(startDate, endDate)
}

export function filterTicketsByCreatedRange(tickets: Ticket[], range: ReportDateRangeParams = {}) {
  const { startDate, endDate } = range
  if (!startDate && !endDate) return tickets
  return tickets.filter((ticket) => isIsoInInclusiveRange(ticket.createdAt, startDate, endDate))
}

export function aggregateTicketsByStatus(tickets: Ticket[]): TicketsByStatusItem[] {
  const counts = new Map<string, number>()
  for (const ticket of tickets) {
    counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1)
  }
  const total = tickets.length
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      status,
      count,
      percentage: total ? Math.round((count / total) * 1000) / 10 : 0,
    }))
}

export function aggregateTicketsByAgent(tickets: Ticket[], now = Date.now()): TicketsByAgentItem[] {
  const byAgent = new Map<string, TicketsByAgentItem>()
  for (const ticket of tickets) {
    if (!ticket.assigneeId || !ticket.assigneeName) continue
    const current = byAgent.get(ticket.assigneeId) ?? {
      agentId: ticket.assigneeId,
      agentName: ticket.assigneeName,
      open: 0,
      inProgress: 0,
      resolved: 0,
      overdue: 0,
      total: 0,
    }
    if (OPEN_STATUSES.includes(ticket.status)) current.open += 1
    if (IN_PROGRESS_STATUSES.includes(ticket.status)) current.inProgress += 1
    if (RESOLVED_STATUSES.includes(ticket.status)) current.resolved += 1
    const overdue =
      new Date(ticket.slaDueAt).getTime() < now && !CLOSED_STATUSES.includes(ticket.status)
    if (overdue) current.overdue += 1
    current.total += 1
    byAgent.set(ticket.assigneeId, current)
  }
  return [...byAgent.values()].sort((a, b) => b.total - a.total)
}

export function aggregateTicketsByCategory(tickets: Ticket[]): TicketsByCategoryItem[] {
  const counts = new Map<string, TicketsByCategoryItem>()
  for (const ticket of tickets) {
    const key = `${ticket.categoryName}::${ticket.priorityName}`
    const current = counts.get(key) ?? {
      category: ticket.categoryName,
      priority: ticket.priorityName,
      count: 0,
    }
    current.count += 1
    counts.set(key, current)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

export function aggregateTicketsByCompany(
  tickets: Ticket[],
  companyMeta: Record<string, CompanyReportMeta> = {},
): TicketsByCompanyItem[] {
  const counts = new Map<string, TicketsByCompanyItem>()
  for (const ticket of tickets) {
    const company = ticket.companyName ?? ticket.clientName
    if (!company) continue
    const meta = companyMeta[company] ?? {}
    const current = counts.get(company) ?? {
      company,
      industry: meta.industry ?? '',
      region: meta.region ?? '',
      tickets: 0,
    }
    current.tickets += 1
    counts.set(company, current)
  }
  return [...counts.values()].sort((a, b) => b.tickets - a.tickets)
}

export function aggregateSlaCompliance(
  tickets: Ticket[],
  range: ReportDateRangeParams = {},
): SlaComplianceSummary {
  const { startDate, endDate } = range
  const closed = tickets.filter(
    (ticket) =>
      RESOLVED_STATUSES.includes(ticket.status) &&
      isIsoInInclusiveRange(ticket.closedAt, startDate, endDate),
  )
  const withinSla = closed.filter(
    (ticket) => ticket.closedAt && ticket.closedAt <= ticket.slaDueAt,
  ).length
  const outOfSla = closed.length - withinSla
  const total = closed.length
  return {
    periodLabel: startDate || endDate ? `${startDate ?? 'inicio'} - ${endDate ?? 'hoy'}` : 'Histórico',
    withinSla,
    outOfSla,
    withinPercentage: total ? Math.round((withinSla / total) * 1000) / 10 : 0,
    outPercentage: total ? Math.round((outOfSla / total) * 1000) / 10 : 0,
  }
}

export function aggregateSatisfaction(
  tickets: Ticket[],
  range: ReportDateRangeParams = {},
): SatisfactionSummary {
  const { startDate, endDate } = range
  const surveys = tickets
    .map((ticket) => ticket.survey)
    .filter((survey): survey is NonNullable<Ticket['survey']> => Boolean(survey))
    .filter((survey) => isIsoInInclusiveRange(survey.submittedAt, startDate, endDate))
  const byRating = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: surveys.filter((survey) => survey.rating === rating).length,
  }))
  const totalResponses = surveys.length
  const ratingSum = surveys.reduce((sum, survey) => sum + survey.rating, 0)
  return {
    averageRating: totalResponses ? Math.round((ratingSum / totalResponses) * 10) / 10 : 0,
    totalResponses,
    byRating,
  }
}

export function hasPositiveValues(values: number[]) {
  return values.some((value) => value > 0)
}
