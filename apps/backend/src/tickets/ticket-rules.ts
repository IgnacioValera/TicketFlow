import { BadRequestException, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common'
import { LIMITS } from '../common/limits'
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

export function isTicketFinalized(status: TicketStatus) {
  return status === TicketStatus.CLOSED || status === TicketStatus.CANCELLED
}

export function assertTicketMutable(ticket: { status: TicketStatus }) {
  if (isTicketFinalized(ticket.status)) {
    throw new ConflictException(`El ticket está finalizado (${ticket.status}) y no admite esta operación`)
  }
}

export function statusRequiresReason(from: TicketStatus, to: TicketStatus) {
  if (
    to === TicketStatus.CANCELLED ||
    to === TicketStatus.WAITING_USER ||
    to === TicketStatus.RESOLVED ||
    to === TicketStatus.ESCALATED
  ) {
    return true
  }
  return from === TicketStatus.CLOSED && to === TicketStatus.IN_PROGRESS
}

export function assertStatusReason(from: TicketStatus, to: TicketStatus, reason?: string) {
  if (!statusRequiresReason(from, to)) return
  const trimmed = reason?.trim() ?? ''
  if (!trimmed) {
    throw new BadRequestException('El motivo es obligatorio para esta transición de estado')
  }
  if (trimmed.length > LIMITS.REASON) {
    throw new BadRequestException(`El motivo no puede superar ${LIMITS.REASON} caracteres`)
  }
  if (to === TicketStatus.ESCALATED && trimmed.length < LIMITS.ESCALATE_REASON_MIN) {
    throw new BadRequestException(`El motivo de escalamiento debe tener al menos ${LIMITS.ESCALATE_REASON_MIN} caracteres`)
  }
}

export function hasPermission(user: User, code: string) {
  return (user.role.permissions ?? []).some((permission) => permission.code === code)
}

export function assertTicketSurvey(ticket: { status: TicketStatus; requester: { id: string } }, user: User) {
  if (!hasPermission(user, 'SURVEY_RESPOND')) {
    throw new ForbiddenException('No tienes permiso para responder la encuesta')
  }
  if (ticket.requester.id !== user.id) {
    throw new ForbiddenException('Sólo el solicitante puede responder la encuesta')
  }
  if (ticket.status !== TicketStatus.CLOSED) {
    throw new UnprocessableEntityException('La encuesta está disponible cuando el ticket está cerrado')
  }
}

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
