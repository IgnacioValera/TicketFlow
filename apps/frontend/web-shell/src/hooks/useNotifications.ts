import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as notificationsService from '@/services/notifications.service'
import { createSubmitLock } from '@/utils/submit-lock'
import {
  NOTIFICATIONS_POLL_MS,
  shouldPollNotifications,
  type NotificationItem,
} from '@/utils/notifications'

export function useNotifications() {
  const { isAuthenticated, user } = useAuth()
  const pathname = usePathname() ?? ''
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const pendingRefresh = useRef(false)
  const [readLock] = useState(() => createSubmitLock())
  const enabled = shouldPollNotifications(isAuthenticated, pathname) && Boolean(user)

  const refresh = useCallback(async () => {
    if (!enabled) return
    if (inFlight.current) {
      pendingRefresh.current = true
      return
    }
    inFlight.current = true
    setLoading(true)
    setError('')
    try {
      const [list, count] = await Promise.all([
        notificationsService.getNotifications({ page: 1, perPage: 8 }),
        notificationsService.getUnreadCount(),
      ])
      setItems(list.data)
      setUnreadCount(Number.isFinite(count) ? Math.max(0, count) : 0)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudieron cargar las notificaciones.')
    } finally {
      setLoading(false)
      inFlight.current = false
      if (pendingRefresh.current) {
        pendingRefresh.current = false
        void refresh()
      }
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setUnreadCount(0)
      setError('')
      return
    }
    void refresh()
    const timer = window.setInterval(() => {
      void refresh()
    }, NOTIFICATIONS_POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, refresh])

  const markRead = useCallback(
    async (id: string) => {
      const updated = await notificationsService.markNotificationRead(id)
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...updated, readAt: updated.readAt } : item)))
      setUnreadCount((count) => Math.max(0, count - 1))
      return updated
    },
    [],
  )

  const markAllRead = useCallback(async () => {
    await readLock.run(async () => {
      await notificationsService.markAllNotificationsRead()
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
      setUnreadCount(0)
    })
  }, [readLock])

  return { items, unreadCount, loading, error, refresh, markRead, markAllRead, enabled }
}
