import { TicketStatus } from '../database/entities'

export const NotificationType = {
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TICKET_REASSIGNED: 'TICKET_REASSIGNED',
  COMMENT_PUBLIC: 'COMMENT_PUBLIC',
  ATTACHMENT_PUBLIC: 'ATTACHMENT_PUBLIC',
  INTERNAL_COMMENT: 'INTERNAL_COMMENT',
  STATUS_CHANGED: 'STATUS_CHANGED',
  WAITING_USER: 'WAITING_USER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
  ESCALATED: 'ESCALATED',
  PRIORITY_CHANGED: 'PRIORITY_CHANGED',
} as const

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

const TERMINAL: TicketStatus[] = [TicketStatus.CLOSED, TicketStatus.RESOLVED, TicketStatus.CANCELLED]

export function statusNotificationType(oldStatus: TicketStatus, newStatus: TicketStatus): NotificationType | null {
  if (oldStatus === newStatus) return null
  if (newStatus === TicketStatus.WAITING_USER) return NotificationType.WAITING_USER
  if (newStatus === TicketStatus.RESOLVED) return NotificationType.RESOLVED
  if (newStatus === TicketStatus.CLOSED) return NotificationType.CLOSED
  if (newStatus === TicketStatus.ESCALATED) return NotificationType.ESCALATED
  if (TERMINAL.includes(oldStatus) && !TERMINAL.includes(newStatus)) return NotificationType.REOPENED
  if (newStatus === TicketStatus.ASSIGNED) return null
  return NotificationType.STATUS_CHANGED
}

export function notificationRecipients(input: {
  type: NotificationType
  actorId: string
  requesterId: string
  assigneeId?: string | null
  previousAssigneeId?: string | null
  supervisorIds?: string[]
}): string[] {
  const ids = new Set<string>()
  const add = (id?: string | null, allowActor = false) => {
    if (!id) return
    if (!allowActor && id === input.actorId) return
    ids.add(id)
  }

  switch (input.type) {
    case NotificationType.TICKET_CREATED:
      add(input.requesterId, true)
      add(input.assigneeId)
      break
    case NotificationType.TICKET_ASSIGNED:
      add(input.requesterId)
      add(input.assigneeId)
      break
    case NotificationType.TICKET_REASSIGNED:
      add(input.requesterId)
      add(input.assigneeId)
      add(input.previousAssigneeId)
      break
    case NotificationType.COMMENT_PUBLIC:
    case NotificationType.ATTACHMENT_PUBLIC:
      if (input.actorId === input.requesterId) add(input.assigneeId)
      else add(input.requesterId)
      break
    case NotificationType.INTERNAL_COMMENT:
      add(input.assigneeId)
      break
    case NotificationType.WAITING_USER:
      add(input.requesterId)
      break
    case NotificationType.RESOLVED:
    case NotificationType.CLOSED:
    case NotificationType.STATUS_CHANGED:
    case NotificationType.REOPENED:
      add(input.requesterId)
      add(input.assigneeId)
      break
    case NotificationType.ESCALATED:
      add(input.assigneeId)
      for (const supervisorId of input.supervisorIds ?? []) add(supervisorId)
      break
    case NotificationType.PRIORITY_CHANGED:
      add(input.assigneeId)
      break
  }

  return [...ids]
}

export function notificationCopy(
  type: NotificationType,
  folio: string,
  extras?: { statusLabel?: string; actorIsRequester?: boolean },
): { title: string; message: string } {
  switch (type) {
    case NotificationType.TICKET_CREATED:
      return { title: 'Ticket creado', message: `Tu ticket ${folio} se registró correctamente.` }
    case NotificationType.TICKET_ASSIGNED:
      return extras?.actorIsRequester
        ? { title: 'Ticket asignado', message: `El ticket ${folio} fue asignado a un agente.` }
        : { title: 'Nuevo ticket asignado', message: `Se te asignó el ticket ${folio}.` }
    case NotificationType.TICKET_REASSIGNED:
      return { title: 'Ticket reasignado', message: `El ticket ${folio} cambió de agente responsable.` }
    case NotificationType.COMMENT_PUBLIC:
      return extras?.actorIsRequester
        ? { title: 'Nuevo comentario', message: `El solicitante agregó un comentario en ${folio}.` }
        : { title: 'Nuevo comentario', message: `Hay un comentario nuevo en el ticket ${folio}.` }
    case NotificationType.ATTACHMENT_PUBLIC:
      return extras?.actorIsRequester
        ? { title: 'Archivo adjunto', message: `El solicitante agregó un archivo en ${folio}.` }
        : { title: 'Archivo adjunto', message: `Se agregó un archivo al ticket ${folio}.` }
    case NotificationType.INTERNAL_COMMENT:
      return { title: 'Nota interna', message: `Hay una nota interna en el ticket ${folio}.` }
    case NotificationType.WAITING_USER:
      return { title: 'Respuesta requerida', message: `El ticket ${folio} está esperando tu respuesta.` }
    case NotificationType.RESOLVED:
      return { title: 'Ticket resuelto', message: `El ticket ${folio} fue marcado como Resuelto.` }
    case NotificationType.CLOSED:
      return { title: 'Ticket cerrado', message: `El ticket ${folio} fue cerrado.` }
    case NotificationType.REOPENED:
      return { title: 'Ticket reabierto', message: `El ticket ${folio} fue reabierto.` }
    case NotificationType.ESCALATED:
      return { title: 'Ticket escalado', message: `El ticket ${folio} fue escalado.` }
    case NotificationType.PRIORITY_CHANGED:
      return { title: 'Prioridad actualizada', message: `Cambió la prioridad del ticket ${folio}.` }
    default:
      return {
        title: 'Estado actualizado',
        message: extras?.statusLabel
          ? `El ticket ${folio} cambió a ${extras.statusLabel}.`
          : `El ticket ${folio} cambió de estado.`,
      }
  }
}

export function copyForRecipient(
  type: NotificationType,
  folio: string,
  recipientId: string,
  requesterId: string,
  extras?: { statusLabel?: string },
) {
  if (type === NotificationType.TICKET_ASSIGNED && recipientId === requesterId) {
    return notificationCopy(type, folio, { actorIsRequester: true })
  }
  if (
    (type === NotificationType.COMMENT_PUBLIC || type === NotificationType.ATTACHMENT_PUBLIC) &&
    recipientId !== requesterId
  ) {
    return notificationCopy(type, folio, { actorIsRequester: true })
  }
  return notificationCopy(type, folio, extras)
}
