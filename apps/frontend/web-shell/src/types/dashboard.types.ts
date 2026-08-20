import type { TicketStatus, SlaLevel } from '@/types/ticket.types'

export interface KpiMetric {
  key: 'open' | 'overdue' | 'resolved' | 'inProgress' | 'closed'
  label: string
  value: number
}

export interface DashboardTrendPoint {
  period: string
  open: number
  resolved: number
  inProgress: number
}

export interface DashboardDistributionPoint {
  name: string
  value: number
}

export interface DashboardTicketSummary {
  id: string
  folio: string
  title: string
  status: TicketStatus
  priorityName: string
  priorityColor?: string
  assigneeName?: string | null
  slaLevel: SlaLevel
  createdAt: string
  slaDueAt: string
}

export interface DashboardSlaAlerts {
  overdueCount: number
  warningCount: number
}

export interface DashboardSummary {
  scope: 'GLOBAL' | 'OWN'
  kpis: KpiMetric[]
  trend: DashboardTrendPoint[]
  distribution: DashboardDistributionPoint[]
  recentTickets: DashboardTicketSummary[]
  urgentTickets: DashboardTicketSummary[]
  slaAlerts: DashboardSlaAlerts
}
