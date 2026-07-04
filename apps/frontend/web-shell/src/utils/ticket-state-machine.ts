import type { TicketStatus } from '@/types/ticket.types'
import type { UserRole } from '@/types/user.types'
import { PERMISSIONS } from '@/types/permission.types'

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'ESCALATED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_USER', 'RESOLVED', 'ESCALATED'],
  WAITING_USER: ['IN_PROGRESS', 'CANCELLED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'],
  CANCELLED: [],
}

export interface TransitionContext {
  role: UserRole
  permissions: string[]
  isAssignee: boolean
  isRequester: boolean
}

function canTransitionTo(
  from: TicketStatus,
  to: TicketStatus,
  ctx: TransitionContext,
): boolean {
  if (!TRANSITIONS[from]?.includes(to)) return false

  const { role, permissions, isAssignee, isRequester } = ctx
  const canChangeStatus = permissions.includes(PERMISSIONS.TICKET_STATUS_CHANGE)
  const isSupervisorOrAdmin = role === 'SUPERVISOR' || role === 'ADMIN'

  switch (to) {
    case 'ASSIGNED':
    case 'CANCELLED':
      return isSupervisorOrAdmin
    case 'IN_PROGRESS':
      if (from === 'CLOSED') return isSupervisorOrAdmin || isRequester
      return (isAssignee && canChangeStatus) || isSupervisorOrAdmin
    case 'WAITING_USER':
    case 'RESOLVED':
    case 'ESCALATED':
      return (isAssignee && canChangeStatus) || isSupervisorOrAdmin
    case 'CLOSED':
      return isRequester || isSupervisorOrAdmin
    default:
      return isSupervisorOrAdmin
  }
}

export function getAllowedTransitions(
  currentStatus: TicketStatus,
  ctx: TransitionContext,
): TicketStatus[] {
  return (TRANSITIONS[currentStatus] ?? []).filter((to) =>
    canTransitionTo(currentStatus, to, ctx),
  )
}

export const STATUS_ACTION_LABELS: Partial<Record<TicketStatus, string>> = {
  ASSIGNED: 'Marcar asignado',
  IN_PROGRESS: 'Iniciar atención',
  WAITING_USER: 'Esperar usuario',
  RESOLVED: 'Resolver',
  ESCALATED: 'Escalar',
  CLOSED: 'Cerrar',
  CANCELLED: 'Cancelar',
}
