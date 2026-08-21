import type {
  DashboardDistributionPoint,
  DashboardSlaAlerts,
  DashboardSummary,
  DashboardTicketSummary,
  DashboardTrendPoint,
  KpiMetric,
} from '@/types/dashboard.types'
import type { Ticket, TicketStatus } from '@/types/ticket.types'
import { calculateSlaStatus } from '@/utils/sla.utils'

export const OPEN_STATUSES: TicketStatus[] = ['OPEN', 'ASSIGNED']
export const IN_PROGRESS_STATUSES: TicketStatus[] = ['IN_PROGRESS', 'WAITING_USER', 'ESCALATED']
export const TERMINAL_STATUSES: TicketStatus[] = ['CLOSED', 'CANCELLED']

export type TicketPreset = 'open' | 'inProgress' | 'resolved' | 'closed'

export function statusesForPreset(preset: TicketPreset): TicketStatus[] {
  switch (preset) {
    case 'open':
      return OPEN_STATUSES
    case 'inProgress':
      return IN_PROGRESS_STATUSES
    case 'resolved':
      return ['RESOLVED']
    case 'closed':
      return ['CLOSED']
  }
}

export function isActiveStatus(status: TicketStatus): boolean {
  return !TERMINAL_STATUSES.includes(status)
}

function isCriticalPriority(ticket: Ticket): boolean {
  return ticket.priorityId === '4' || ticket.priorityName.toLowerCase().includes('crit')
}

function isOverdueActive(ticket: Ticket, now = Date.now()): boolean {
  return isActiveStatus(ticket.status) && new Date(ticket.slaDueAt).getTime() <= now
}

function isSlaWarningTicket(ticket: Ticket): boolean {
  if (!isActiveStatus(ticket.status)) return false
  const sla = calculateSlaStatus(ticket.slaCreatedAt, ticket.slaDueAt, ticket.resolutionHours)
  return sla.level === 'orange' || sla.level === 'yellow'
}

export function isUrgentTicket(ticket: Ticket): boolean {
  if (!isActiveStatus(ticket.status)) return false
  if (isOverdueActive(ticket)) return true
  if (isCriticalPriority(ticket)) return true
  return isSlaWarningTicket(ticket)
}

function urgentScore(ticket: Ticket): number {
  if (!isUrgentTicket(ticket)) return Number.POSITIVE_INFINITY
  let score = 100
  if (isOverdueActive(ticket)) score -= 50
  if (isCriticalPriority(ticket)) score -= 30
  const sla = calculateSlaStatus(ticket.slaCreatedAt, ticket.slaDueAt, ticket.resolutionHours)
  if (sla.level === 'orange') score -= 20
  if (sla.level === 'yellow') score -= 10
  return score + new Date(ticket.slaDueAt).getTime() / 1_000_000_000
}

export function serializeDashboardTicket(ticket: Ticket): DashboardTicketSummary {
  const sla = calculateSlaStatus(ticket.slaCreatedAt, ticket.slaDueAt, ticket.resolutionHours)
  return {
    id: ticket.id,
    folio: ticket.folio,
    title: ticket.title,
    status: ticket.status,
    priorityName: ticket.priorityName,
    priorityColor: ticket.priorityColor,
    assigneeName: ticket.assigneeName ?? null,
    slaLevel: sla.level,
    createdAt: ticket.createdAt,
    slaDueAt: ticket.slaDueAt,
  }
}

function buildTrend(tickets: Ticket[]): DashboardTrendPoint[] {
  const days = 6
  const buckets: DashboardTrendPoint[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    dayStart.setDate(dayStart.getDate() - offset)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dayTickets = tickets.filter((ticket) => {
      const created = new Date(ticket.createdAt).getTime()
      return created >= dayStart.getTime() && created < dayEnd.getTime()
    })

    buckets.push({
      period: dayStart.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }),
      open: dayTickets.filter((ticket) => OPEN_STATUSES.includes(ticket.status)).length,
      inProgress: dayTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
      resolved: dayTickets.filter((ticket) => ['RESOLVED', 'CLOSED'].includes(ticket.status)).length,
    })
  }
  return buckets
}

export function buildDashboardSummary(tickets: Ticket[], scope: 'GLOBAL' | 'OWN'): DashboardSummary {
  const overdue = tickets.filter((ticket) => isOverdueActive(ticket)).length
  const kpis: KpiMetric[] = [
    { key: 'open', label: 'Abiertos', value: tickets.filter((ticket) => OPEN_STATUSES.includes(ticket.status)).length },
    { key: 'overdue', label: 'Vencidos', value: overdue },
    {
      key: 'inProgress',
      label: 'En proceso',
      value: tickets.filter((ticket) => IN_PROGRESS_STATUSES.includes(ticket.status)).length,
    },
    { key: 'resolved', label: 'Resueltos', value: tickets.filter((ticket) => ticket.status === 'RESOLVED').length },
    { key: 'closed', label: 'Cerrados', value: tickets.filter((ticket) => ticket.status === 'CLOSED').length },
  ]

  const activeTickets = tickets.filter((ticket) => isActiveStatus(ticket.status))
  const slaAlerts: DashboardSlaAlerts = {
    overdueCount: activeTickets.filter((ticket) => isOverdueActive(ticket)).length,
    warningCount: activeTickets.filter((ticket) => isSlaWarningTicket(ticket)).length,
  }

  const recentTickets = [...tickets]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5)
    .map(serializeDashboardTicket)

  const urgentTickets = [...tickets]
    .filter(isUrgentTicket)
    .sort((left, right) => urgentScore(left) - urgentScore(right))
    .slice(0, 5)
    .map(serializeDashboardTicket)

  const distribution: DashboardDistributionPoint[] = kpis.map((kpi) => ({
    name: kpi.label,
    value: kpi.value,
  }))

  return {
    scope,
    kpis,
    trend: buildTrend(tickets),
    distribution,
    recentTickets,
    urgentTickets,
    slaAlerts,
  }
}

export function kpiFilterHref(key: KpiMetric['key']): string {
  switch (key) {
    case 'open':
      return '/tickets?preset=open'
    case 'overdue':
      return '/tickets?slaStatus=overdue'
    case 'inProgress':
      return '/tickets?preset=inProgress'
    case 'resolved':
      return '/tickets?preset=resolved'
    case 'closed':
      return '/tickets?preset=closed'
    default:
      return '/tickets'
  }
}
