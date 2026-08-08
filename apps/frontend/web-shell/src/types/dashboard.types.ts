export interface KpiMetric {
  key: 'open' | 'overdue' | 'resolved' | 'inProgress'
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

export interface DashboardSummary {
  scope: 'GLOBAL' | 'OWN'
  kpis: KpiMetric[]
  trend: DashboardTrendPoint[]
  distribution: DashboardDistributionPoint[]
}
