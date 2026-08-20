import type { User } from '@/types/user.types'
import type { Ticket } from '@/types/ticket.types'
import type { NotificationItem } from '@/utils/notifications'

interface StoredNotification extends NotificationItem {
  recipientUserId: string
  dedupeKey: string
}

const store: StoredNotification[] = []
let seq = 1

function pushUnique(item: Omit<StoredNotification, 'id' | 'createdAt' | 'readAt'> & { createdAt?: string }) {
  if (store.some((entry) => entry.recipientUserId === item.recipientUserId && entry.dedupeKey === item.dedupeKey)) {
    return
  }
  store.unshift({
    ...item,
    id: `n-${seq++}-${Date.now()}`,
    createdAt: item.createdAt ?? new Date().toISOString(),
    readAt: null,
  })
}

export function listNotifications(userId: string, query: { page?: number; perPage?: number; unread?: boolean }) {
  const page = query.page ?? 1
  const perPage = query.perPage ?? 20
  let items = store.filter((item) => item.recipientUserId === userId)
  if (query.unread) items = items.filter((item) => !item.readAt)
  const total = items.length
  const start = (page - 1) * perPage
  return {
    items: items.slice(start, start + perPage).map(publicNotification),
    meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  }
}

export function unreadCount(userId: string) {
  return store.filter((item) => item.recipientUserId === userId && !item.readAt).length
}

export function markNotificationRead(id: string, userId: string) {
  const item = store.find((entry) => entry.id === id && entry.recipientUserId === userId)
  if (!item) return null
  if (!item.readAt) item.readAt = new Date().toISOString()
  return publicNotification(item)
}

export function markAllRead(userId: string) {
  const now = new Date().toISOString()
  store.forEach((item) => {
    if (item.recipientUserId === userId && !item.readAt) item.readAt = now
  })
}

function publicNotification(item: StoredNotification): NotificationItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    message: item.message,
    ticketId: item.ticketId,
    ticketFolio: item.ticketFolio,
    readAt: item.readAt,
    createdAt: item.createdAt,
  }
}

function notify(
  recipientId: string | null | undefined,
  actorId: string,
  ticket: Ticket,
  dedupeKey: string,
  type: string,
  title: string,
  message: string,
  allowActor = false,
) {
  if (!recipientId) return
  if (!allowActor && recipientId === actorId) return
  pushUnique({
    recipientUserId: recipientId,
    dedupeKey,
    type,
    title,
    message,
    ticketId: ticket.id,
    ticketFolio: ticket.folio,
  })
}

export function notifyTicketCreated(ticket: Ticket, actor: User) {
  const key = `history:created:${ticket.id}`
  notify(ticket.requesterId, actor.id, ticket, key, 'TICKET_CREATED', 'Ticket creado', `Tu ticket ${ticket.folio} se registró correctamente.`, true)
  notify(ticket.assigneeId, actor.id, ticket, key, 'TICKET_CREATED', 'Nuevo ticket asignado', `Se te asignó el ticket ${ticket.folio}.`)
}

export function notifyTicketAssigned(ticket: Ticket, actor: User, previousAssigneeId?: string | null) {
  const key = `history:assign:${ticket.id}:${ticket.assigneeId}:${previousAssigneeId ?? 'none'}`
  const type = previousAssigneeId ? 'TICKET_REASSIGNED' : 'TICKET_ASSIGNED'
  notify(
    ticket.requesterId,
    actor.id,
    ticket,
    key,
    type,
    previousAssigneeId ? 'Ticket reasignado' : 'Ticket asignado',
    previousAssigneeId
      ? `El ticket ${ticket.folio} cambió de agente responsable.`
      : `El ticket ${ticket.folio} fue asignado a un agente.`,
  )
  notify(ticket.assigneeId, actor.id, ticket, key, type, 'Nuevo ticket asignado', `Se te asignó el ticket ${ticket.folio}.`)
  notify(
    previousAssigneeId,
    actor.id,
    ticket,
    key,
    type,
    'Ticket reasignado',
    `El ticket ${ticket.folio} cambió de agente responsable.`,
  )
}

export function notifyPublicComment(ticket: Ticket, actor: User, commentId: string) {
  const key = `comment:${commentId}`
  if (actor.id === ticket.requesterId) {
    notify(ticket.assigneeId, actor.id, ticket, key, 'COMMENT_PUBLIC', 'Nuevo comentario', `El solicitante agregó un comentario en ${ticket.folio}.`)
  } else {
    notify(ticket.requesterId, actor.id, ticket, key, 'COMMENT_PUBLIC', 'Nuevo comentario', `Hay un comentario nuevo en el ticket ${ticket.folio}.`)
  }
}

export function notifyInternalComment(ticket: Ticket, actor: User, commentId: string) {
  notify(
    ticket.assigneeId,
    actor.id,
    ticket,
    `comment:${commentId}`,
    'INTERNAL_COMMENT',
    'Nota interna',
    `Hay una nota interna en el ticket ${ticket.folio}.`,
  )
}

export function notifyStatusChanged(ticket: Ticket, actor: User, status: string) {
  const key = `history:status:${ticket.id}:${status}:${Date.now()}`
  const copy =
    status === 'RESOLVED'
      ? { title: 'Ticket resuelto', message: `El ticket ${ticket.folio} fue marcado como Resuelto.` }
      : status === 'CLOSED'
        ? { title: 'Ticket cerrado', message: `El ticket ${ticket.folio} fue cerrado.` }
        : status === 'WAITING_USER'
          ? { title: 'Respuesta requerida', message: `El ticket ${ticket.folio} está esperando tu respuesta.` }
          : { title: 'Estado actualizado', message: `El ticket ${ticket.folio} cambió de estado.` }
  if (status === 'WAITING_USER') {
    notify(ticket.requesterId, actor.id, ticket, key, 'WAITING_USER', copy.title, copy.message)
    return
  }
  notify(ticket.requesterId, actor.id, ticket, key, 'STATUS_CHANGED', copy.title, copy.message)
  notify(ticket.assigneeId, actor.id, ticket, key, 'STATUS_CHANGED', copy.title, copy.message)
}
