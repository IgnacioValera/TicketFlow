import { LIMITS } from '@/constants/validation'
import type { Ticket, TicketStatus } from '@/types/ticket.types'
import type { User } from '@/types/user.types'
import {
  canTransition,
  isTicketFinalized,
  statusRequiresReason,
  TRANSITIONS,
} from '@/utils/ticket-state-machine'

export interface TicketMutationError {
  status: number
  message: string
}

function transitionContext(user: User, ticket: Ticket) {
  return {
    role: user.role,
    permissions: user.permissions ?? [],
    isAssignee: ticket.assigneeId === user.id,
    isRequester: ticket.requesterId === user.id,
  }
}

export function assertMutableTicket(ticket: Ticket): TicketMutationError | null {
  if (isTicketFinalized(ticket.status)) {
    return {
      status: 409,
      message: `El ticket está finalizado (${ticket.status}) y no admite esta operación`,
    }
  }
  return null
}

export function validateStatusChange(
  ticket: Ticket,
  user: User,
  nextStatus: TicketStatus,
  reason?: string,
): TicketMutationError | null {
  const from = ticket.status
  if (!TRANSITIONS[from]?.includes(nextStatus)) {
    return { status: 422, message: `Transición de ${from} a ${nextStatus} no permitida` }
  }

  const ctx = transitionContext(user, ticket)
  if (!canTransition(from, nextStatus, ctx)) {
    return { status: 403, message: 'No puedes realizar esa transición de estado' }
  }

  if (statusRequiresReason(from, nextStatus)) {
    const trimmed = reason?.trim() ?? ''
    if (!trimmed) {
      return { status: 400, message: 'El motivo es obligatorio para esta transición de estado' }
    }
    if (trimmed.length > LIMITS.REASON) {
      return { status: 400, message: `El motivo no puede superar ${LIMITS.REASON} caracteres` }
    }
    if (nextStatus === 'ESCALATED' && trimmed.length < LIMITS.ESCALATE_REASON_MIN) {
      return {
        status: 400,
        message: `El motivo de escalamiento debe tener al menos ${LIMITS.ESCALATE_REASON_MIN} caracteres`,
      }
    }
  }

  return null
}

export function validateAssign(user: User, ticket: Ticket): TicketMutationError | null {
  const mutable = assertMutableTicket(ticket)
  if (mutable) return mutable
  if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
    return { status: 403, message: 'Sólo administrador o supervisor pueden asignar tickets' }
  }
  return null
}

export function validateClose(user: User, ticket: Ticket): TicketMutationError | null {
  if (ticket.status !== 'RESOLVED') {
    return { status: 422, message: 'Sólo se puede cerrar un ticket resuelto' }
  }
  const ctx = transitionContext(user, ticket)
  const allowed =
    ctx.isRequester ||
    user.role === 'SUPERVISOR' ||
    user.role === 'ADMIN' ||
    ctx.isAssignee
  if (!allowed) {
    return { status: 403, message: 'No puedes realizar esa transición de estado' }
  }
  return null
}

export function validateAttachmentFile(file: File): TicketMutationError | null {
  if (file.size > LIMITS.FILE_MAX_BYTES) {
    return { status: 413, message: 'El archivo no debe superar 5 MB' }
  }
  const allowed = ['.pdf', '.docx', '.jpg', '.jpeg', '.png']
  const lower = file.name.toLowerCase()
  if (!allowed.some((ext) => lower.endsWith(ext))) {
    return { status: 422, message: 'Tipo de archivo no permitido. Usa PDF, DOCX, JPG o PNG.' }
  }
  return null
}
