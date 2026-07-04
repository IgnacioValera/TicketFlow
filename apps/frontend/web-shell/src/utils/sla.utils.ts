import type { SlaLevel, TicketSlaStatus } from '@/types/ticket.types'

export function calculateSlaStatus(
  createdAt: string,
  slaDueAt: string,
  resolutionHours: number,
): TicketSlaStatus {
  const start = new Date(createdAt).getTime()
  const due = new Date(slaDueAt).getTime()
  const now = Date.now()
  const totalMs = due - start
  const remainingMs = due - now

  if (remainingMs <= 0) {
    return {
      level: 'red',
      percentRemaining: 0,
      dueAt: slaDueAt,
      createdAt,
      resolutionHours,
    }
  }

  const percentRemaining = (remainingMs / totalMs) * 100

  let level: SlaLevel = 'green'
  if (percentRemaining <= 20) level = 'orange'
  else if (percentRemaining <= 50) level = 'yellow'

  return {
    level,
    percentRemaining: Math.round(percentRemaining * 10) / 10,
    dueAt: slaDueAt,
    createdAt,
    resolutionHours,
  }
}

export const SLA_LABELS: Record<SlaLevel, string> = {
  green: 'En tiempo',
  yellow: 'Atención',
  orange: 'Próximo a vencer',
  red: 'Vencido',
}

export const SLA_COLORS: Record<SlaLevel, string> = {
  green: 'bg-sla-green/15 text-sla-green border-sla-green/30',
  yellow: 'bg-sla-yellow/15 text-amber-800 border-sla-yellow/30',
  orange: 'bg-sla-orange/15 text-sla-orange border-sla-orange/30',
  red: 'bg-sla-red/15 text-sla-red border-sla-red/30',
}

export function matchesSlaFilter(
  sla: TicketSlaStatus,
  filter: 'overdue' | 'warning' | 'on_time',
): boolean {
  if (filter === 'overdue') return sla.level === 'red'
  if (filter === 'warning') return sla.level === 'orange' || sla.level === 'yellow'
  return sla.level === 'green'
}
