import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common'
import { RoleCode, TicketStatus, User } from '../database/entities'

export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.ASSIGNED, TicketStatus.CANCELLED],
  [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED, TicketStatus.CANCELLED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.WAITING_USER, TicketStatus.RESOLVED, TicketStatus.ESCALATED],
  [TicketStatus.WAITING_USER]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  [TicketStatus.ESCALATED]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.CANCELLED]: [],
}

export function hasPermission(user: User, code: string) { return (user.role.permissions ?? []).some((permission) => permission.code === code) }

export function assertTransition(from: TicketStatus, to: TicketStatus, user: User, isAssignee: boolean, isRequester: boolean) {
  if (!TRANSITIONS[from]?.includes(to)) throw new UnprocessableEntityException(`Transición de ${from} a ${to} no permitida`)
  const elevated = user.role.code === RoleCode.ADMIN || user.role.code === RoleCode.SUPERVISOR
  let allowed = false
  switch (to) {
    case TicketStatus.ASSIGNED:
    case TicketStatus.CANCELLED: allowed = elevated; break
    case TicketStatus.IN_PROGRESS: allowed = from === TicketStatus.CLOSED ? elevated || isRequester : elevated || (isAssignee && hasPermission(user, 'TICKET_STATUS_CHANGE')); break
    case TicketStatus.WAITING_USER:
    case TicketStatus.RESOLVED:
    case TicketStatus.ESCALATED: allowed = elevated || (isAssignee && hasPermission(user, 'TICKET_STATUS_CHANGE')); break
    case TicketStatus.CLOSED: allowed = elevated || isRequester || isAssignee; break
  }
  if (!allowed) throw new ForbiddenException('No puedes realizar esa transición de estado')
}

export function calculateSla(createdAt: Date, dueAt: Date, resolutionHours: number, now = new Date()) {
  const total = dueAt.getTime() - createdAt.getTime()
  const remaining = dueAt.getTime() - now.getTime()
  if (remaining <= 0) return { level: 'red' as const, percentRemaining: 0, dueAt: dueAt.toISOString(), createdAt: createdAt.toISOString(), resolutionHours }
  const percentRemaining = total > 0 ? (remaining / total) * 100 : 0
  const level = percentRemaining <= 20 ? 'orange' : percentRemaining <= 50 ? 'yellow' : 'green'
  return { level, percentRemaining: Math.round(percentRemaining * 10) / 10, dueAt: dueAt.toISOString(), createdAt: createdAt.toISOString(), resolutionHours }
}
