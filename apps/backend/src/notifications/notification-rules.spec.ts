import { TicketStatus } from '../database/entities'
import {
  copyForRecipient,
  notificationCopy,
  notificationRecipients,
  NotificationType,
  statusNotificationType,
} from './notification-rules'

describe('Reglas de notificaciones', () => {
  it('elige un tipo específico y no duplica el genérico', () => {
    expect(statusNotificationType(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(NotificationType.RESOLVED)
    expect(statusNotificationType(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(NotificationType.CLOSED)
    expect(statusNotificationType(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(NotificationType.REOPENED)
    expect(statusNotificationType(TicketStatus.OPEN, TicketStatus.ASSIGNED)).toBeNull()
    expect(statusNotificationType(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS)).toBe(NotificationType.STATUS_CHANGED)
  })

  it('no notifica al actor salvo la confirmación de creación', () => {
    expect(
      notificationRecipients({
        type: NotificationType.TICKET_CREATED,
        actorId: 'req',
        requesterId: 'req',
        assigneeId: null,
      }),
    ).toEqual(['req'])

    expect(
      notificationRecipients({
        type: NotificationType.COMMENT_PUBLIC,
        actorId: 'agent',
        requesterId: 'req',
        assigneeId: 'agent',
      }),
    ).toEqual(['req'])

    expect(
      notificationRecipients({
        type: NotificationType.INTERNAL_COMMENT,
        actorId: 'agent',
        requesterId: 'req',
        assigneeId: 'agent',
      }),
    ).toEqual([])
  })

  it('asigna y reasigna a los destinatarios correctos', () => {
    expect(
      notificationRecipients({
        type: NotificationType.TICKET_ASSIGNED,
        actorId: 'admin',
        requesterId: 'req',
        assigneeId: 'agent',
      }).sort(),
    ).toEqual(['agent', 'req'])
  })

  it('comentario del solicitante notifica al agente y no al actor', () => {
    expect(
      notificationRecipients({
        type: NotificationType.COMMENT_PUBLIC,
        actorId: 'req',
        requesterId: 'req',
        assigneeId: 'agent',
      }),
    ).toEqual(['agent'])
  })

  it('en reasignación avisa al solicitante, al nuevo y al anterior', () => {
    expect(
      notificationRecipients({
        type: NotificationType.TICKET_REASSIGNED,
        actorId: 'admin',
        requesterId: 'req',
        assigneeId: 'agent-2',
        previousAssigneeId: 'agent-1',
      }).sort(),
    ).toEqual(['agent-1', 'agent-2', 'req'])
  })

  it('usa textos en español sin códigos técnicos', () => {
    expect(notificationCopy(NotificationType.TICKET_CREATED, 'HD-2026-0008')).toEqual({
      title: 'Ticket creado',
      message: 'Tu ticket HD-2026-0008 se registró correctamente.',
    })
    const assignedToRequester = copyForRecipient(NotificationType.TICKET_ASSIGNED, 'HD-2026-0008', 'req', 'req')
    expect(assignedToRequester.title).toBe('Ticket asignado')
    expect(assignedToRequester.message).not.toMatch(/STATUS_CHANGED|TICKET_ASSIGNED/)
  })
})
