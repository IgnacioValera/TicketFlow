import { describe, expect, it } from 'vitest'
import {
  exposesTechnicalNotification,
  formatRelativeTime,
  NOTIFICATION_EMPTY,
  recentNotifications,
  shouldPollNotifications,
  ticketClientLabel,
  unreadBadgeLabel,
  type NotificationItem,
} from '@/utils/notifications'
import { createSubmitLock } from '@/utils/submit-lock'
import { REQUESTER_CLIENT_REQUIRED, userCreateFormError, userEditFormError } from '@/utils/user-form'

const sample = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n1',
  type: 'TICKET_CREATED',
  title: 'Ticket creado',
  message: 'Tu ticket HD-2026-0008 se registró correctamente.',
  ticketId: 't1',
  ticketFolio: 'HD-2026-0008',
  readAt: null,
  createdAt: '2026-08-19T12:00:00.000Z',
  ...overrides,
})

describe('Centro de notificaciones (UI)', () => {
  it('formatea el contador 1-99 y 99+', () => {
    expect(unreadBadgeLabel(0)).toBeNull()
    expect(unreadBadgeLabel(-3)).toBeNull()
    expect(unreadBadgeLabel(Number.NaN)).toBeNull()
    expect(unreadBadgeLabel(3)).toBe('3')
    expect(unreadBadgeLabel(99)).toBe('99')
    expect(unreadBadgeLabel(100)).toBe('99+')
  })

  it('prioriza no leídas y limita a 8', () => {
    const items = [
      sample({ id: 'read', readAt: '2026-08-19T12:00:00.000Z', createdAt: '2026-08-19T13:00:00.000Z' }),
      ...Array.from({ length: 9 }, (_, index) =>
        sample({ id: `u${index}`, createdAt: `2026-08-19T0${index}:00:00.000Z` }),
      ),
    ]
    const recent = recentNotifications(items, 8)
    expect(recent).toHaveLength(8)
    expect(recent.every((item) => !item.readAt)).toBe(true)
  })

  it('usa tiempo relativo en español', () => {
    const now = new Date('2026-08-19T12:05:00.000Z')
    expect(formatRelativeTime('2026-08-19T12:00:00.000Z', now)).toMatch(/minuto/)
  })

  it('detiene el polling en login y sin sesión', () => {
    expect(shouldPollNotifications(false, '/tickets')).toBe(false)
    expect(shouldPollNotifications(true, '/login')).toBe(false)
    expect(shouldPollNotifications(true, '/tickets')).toBe(true)
  })

  it('no muestra códigos técnicos ni deja el cliente vacío', () => {
    expect(exposesTechnicalNotification('El ticket HD-2026-0008 cambió a En proceso.')).toBe(false)
    expect(exposesTechnicalNotification('STATUS_CHANGED')).toBe(true)
    expect(ticketClientLabel(null, null)).toBe('Sin cliente asignado')
    expect(NOTIFICATION_EMPTY).toBe('No tienes notificaciones.')
  })

  it('marcar todas como leídas se ejecuta una sola vez', async () => {
    const lock = createSubmitLock()
    const calls: number[] = []
    const action = () =>
      lock.run(async () => {
        calls.push(1)
        await new Promise((resolve) => setTimeout(resolve, 15))
      })
    await Promise.all([action(), action()])
    expect(calls).toHaveLength(1)
  })
})

describe('Cliente obligatorio para solicitante', () => {
  const base = {
    fullName: 'Ana Pérez',
    email: 'ana@helpdesk.com',
    password: 'Password1!',
    confirmPassword: 'Password1!',
    role: 'REQUESTER' as const,
  }

  it('exige cliente solo cuando el rol es Solicitante', () => {
    expect(userCreateFormError(base)).toBe(REQUESTER_CLIENT_REQUIRED)
    expect(userCreateFormError({ ...base, clientId: 'c1' })).toBeNull()
    expect(userCreateFormError({ ...base, role: 'AGENT' })).toBeNull()
  })

  it('en edición también exige cliente al rol Solicitante', () => {
    expect(userEditFormError({ fullName: 'Ana Pérez', email: 'ana@helpdesk.com', role: 'REQUESTER' })).toBe(
      REQUESTER_CLIENT_REQUIRED,
    )
    expect(
      userEditFormError({ fullName: 'Ana Pérez', email: 'ana@helpdesk.com', role: 'AGENT' }),
    ).toBeNull()
  })
})
