export const NOTIFICATIONS_POLL_MS = 45_000

export const NOTIFICATION_EMPTY = 'No tienes notificaciones.'
export const NOTIFICATION_EMPTY_UNREAD = 'No tienes notificaciones sin leer.'
export const NOTIFICATION_LOAD_ERROR = 'No se pudieron cargar las notificaciones.'
export const REQUESTER_UNLINKED =
  'Tu usuario no está vinculado con un cliente. Solicita apoyo al administrador.'

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  ticketId: string | null
  ticketFolio: string | null
  readAt: string | null
  createdAt: string
}

export function unreadBadgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null
  if (count > 99) return '99+'
  return String(Math.trunc(count))
}

export function recentNotifications(items: NotificationItem[], limit = 8): NotificationItem[] {
  return [...items]
    .sort((a, b) => {
      const unreadDelta = Number(!a.readAt) - Number(!b.readAt)
      if (unreadDelta !== 0) return -unreadDelta
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(0, limit)
}

export function formatRelativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSeconds = Math.round((then - now.getTime()) / 1000)
  const abs = Math.abs(diffSeconds)
  const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  if (abs < 60) return formatter.format(Math.trunc(diffSeconds), 'second')
  if (abs < 3600) return formatter.format(Math.trunc(diffSeconds / 60), 'minute')
  if (abs < 86400) return formatter.format(Math.trunc(diffSeconds / 3600), 'hour')
  if (abs < 86400 * 30) return formatter.format(Math.trunc(diffSeconds / 86400), 'day')
  return formatter.format(Math.trunc(diffSeconds / (86400 * 30)), 'month')
}

export function shouldPollNotifications(isAuthenticated: boolean, pathname: string) {
  if (!isAuthenticated) return false
  if (pathname === '/login' || pathname === '/forgot-password') return false
  if (pathname.startsWith('/public/')) return false
  return true
}

export function ticketClientLabel(clientName?: string | null, companyName?: string | null) {
  return clientName || companyName || 'Sin cliente asignado'
}

export function exposesTechnicalNotification(text: string) {
  return /STATUS_CHANGED|TICKET_ASSIGNED|INTERNAL_COMMENT|ESCALATED|PRIORITY_CHANGED/.test(text)
}
