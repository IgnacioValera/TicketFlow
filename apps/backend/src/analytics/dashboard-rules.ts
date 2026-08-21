import { PriorityLevel, TicketStatus } from '../database/entities'

export const OPEN_STATUSES: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.ASSIGNED]
export const IN_PROGRESS_STATUSES: TicketStatus[] = [
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_USER,
  TicketStatus.ESCALATED,
]
export const TERMINAL_STATUSES: TicketStatus[] = [TicketStatus.CLOSED, TicketStatus.CANCELLED]

export type TicketPreset = 'open' | 'inProgress' | 'resolved' | 'closed'

export type SlaLevel = 'green' | 'yellow' | 'orange' | 'red'

export function statusesForPreset(preset: TicketPreset): TicketStatus[] {
  switch (preset) {
    case 'open':
      return OPEN_STATUSES
    case 'inProgress':
      return IN_PROGRESS_STATUSES
    case 'resolved':
      return [TicketStatus.RESOLVED]
    case 'closed':
      return [TicketStatus.CLOSED]
  }
}

export function isActiveStatus(status: TicketStatus): boolean {
  return !TERMINAL_STATUSES.includes(status)
}

export function slaLevelFromDates(
  slaCreatedAt: Date,
  slaDueAt: Date,
  now = new Date(),
): SlaLevel {
  const remainingMs = slaDueAt.getTime() - now.getTime()
  if (remainingMs <= 0) return 'red'

  const totalMs = slaDueAt.getTime() - slaCreatedAt.getTime()
  if (totalMs <= 0) return 'red'

  const percentRemaining = (remainingMs / totalMs) * 100
  if (percentRemaining <= 20) return 'orange'
  if (percentRemaining <= 50) return 'yellow'
  return 'green'
}

export function isOverdueActive(
  status: TicketStatus,
  slaDueAt: Date,
  now = new Date(),
): boolean {
  return isActiveStatus(status) && slaDueAt.getTime() <= now.getTime()
}

export function isSlaWarning(
  status: TicketStatus,
  slaCreatedAt: Date,
  slaDueAt: Date,
  now = new Date(),
): boolean {
  if (!isActiveStatus(status)) return false
  const level = slaLevelFromDates(slaCreatedAt, slaDueAt, now)
  return level === 'orange' || level === 'yellow'
}

export function isUrgentTicket(input: {
  status: TicketStatus
  slaCreatedAt: Date
  slaDueAt: Date
  priorityLevel?: PriorityLevel | null
  now?: Date
}): boolean {
  const now = input.now ?? new Date()
  if (!isActiveStatus(input.status)) return false
  if (isOverdueActive(input.status, input.slaDueAt, now)) return true
  if (input.priorityLevel === PriorityLevel.CRITICAL) return true
  return isSlaWarning(input.status, input.slaCreatedAt, input.slaDueAt, now)
}

export function urgentTicketScore(input: {
  status: TicketStatus
  slaCreatedAt: Date
  slaDueAt: Date
  priorityLevel?: PriorityLevel | null
  now?: Date
}): number {
  const now = input.now ?? new Date()
  if (!isUrgentTicket({ ...input, now })) return Number.POSITIVE_INFINITY

  let score = 100
  if (isOverdueActive(input.status, input.slaDueAt, now)) score -= 50
  if (input.priorityLevel === PriorityLevel.CRITICAL) score -= 30
  const level = slaLevelFromDates(input.slaCreatedAt, input.slaDueAt, now)
  if (level === 'orange') score -= 20
  if (level === 'yellow') score -= 10
  return score + input.slaDueAt.getTime() / 1_000_000_000
}
