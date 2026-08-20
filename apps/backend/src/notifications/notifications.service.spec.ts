import { QueryFailedError } from 'typeorm'
import { Notification, Ticket, User } from '../database/entities'
import { isUniqueViolation } from '../crm/db-errors'
import { notificationRecipients, NotificationType } from './notification-rules'
import { NotificationsService } from './notifications.service'

describe('NotificationsService', () => {
  const notifications = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }
  const service = new NotificationsService(notifications as never)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('serializa sin códigos técnicos ni secretos', () => {
    const item = {
      id: 'n1',
      type: NotificationType.TICKET_CREATED,
      title: 'Ticket creado',
      message: 'Tu ticket HD-2026-0008 se registró correctamente.',
      ticket: { id: 't1', folio: 'HD-2026-0008' },
      readAt: null,
      createdAt: new Date('2026-08-19T12:00:00.000Z'),
    } as Notification
    const serialized = service.serialize(item)
    expect(JSON.stringify(serialized)).not.toMatch(/STATUS_CHANGED|password|token|jwt/i)
    expect(serialized.title).toBe('Ticket creado')
  })

  it('no duplica notificaciones concurrentes con la misma clave', async () => {
    const uniqueError = Object.assign(new QueryFailedError('insert', [], new Error('duplicate')), {
      driverError: { code: '23505' },
    })
    expect(isUniqueViolation(uniqueError)).toBe(true)
    const manager = {
      create: jest.fn((_entity: unknown, value: unknown) => value),
      save: jest.fn().mockRejectedValue(uniqueError),
    }
    const ticket = {
      folio: 'HD-2026-0008',
      requester: { id: 'req' },
      assignee: null,
    } as Ticket
    await expect(
      service.dispatch(manager as never, {
        type: NotificationType.TICKET_CREATED,
        actor: { id: 'req' } as User,
        ticket,
        dedupeKey: 'history:same',
      }),
    ).resolves.toBeUndefined()
    expect(manager.save).toHaveBeenCalled()
  })

  it('marcar como leída es idempotente', async () => {
    const readAt = new Date('2026-08-19T12:00:00.000Z')
    notifications.findOne.mockResolvedValue({
      id: 'n1',
      type: NotificationType.TICKET_CREATED,
      title: 'Ticket creado',
      message: 'Tu ticket HD-2026-0008 se registró correctamente.',
      ticket: { id: 't1', folio: 'HD-2026-0008' },
      readAt,
      createdAt: readAt,
    })
    const first = await service.markRead('n1', { id: 'req' } as User)
    const second = await service.markRead('n1', { id: 'req' } as User)
    expect(notifications.save).not.toHaveBeenCalled()
    expect(first.readAt).toBe(second.readAt)
  })

  it('una nota interna nunca llega al solicitante', () => {
    expect(
      notificationRecipients({
        type: NotificationType.INTERNAL_COMMENT,
        actorId: 'agent',
        requesterId: 'req',
        assigneeId: 'supervisor',
      }),
    ).not.toContain('req')
  })
})
