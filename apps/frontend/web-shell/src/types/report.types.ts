export interface TicketsByStatusItem {
  status: string
  count: number
  percentage: number
}

export interface TicketsByAgentItem {
  agentId: string
  agentName: string
  open: number
  inProgress: number
  resolved: number
  overdue: number
  total: number
}

export interface TicketsByCategoryItem {
  category: string
  priority: string
  count: number
}

export interface SlaComplianceSummary {
  periodLabel: string
  withinSla: number
  outOfSla: number
  withinPercentage: number
  outPercentage: number
}

export interface TicketsByCompanyItem {
  company: string
  industry: string
  region: string
  tickets: number
}

export interface ReportDateRangeParams {
  startDate?: string
  endDate?: string
}
