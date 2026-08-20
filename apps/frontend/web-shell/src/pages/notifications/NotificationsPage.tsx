import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { SecondaryButton } from '@/components/common/UiControls'
import * as notificationsService from '@/services/notifications.service'
import { createSubmitLock } from '@/utils/submit-lock'
import {
  formatRelativeTime,
  NOTIFICATION_EMPTY,
  NOTIFICATION_EMPTY_UNREAD,
  NOTIFICATION_LOAD_ERROR,
  type NotificationItem,
} from '@/utils/notifications'

export function NotificationsPage() {
  const navigate = useNavigate()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readLock] = useState(() => createSubmitLock())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await notificationsService.getNotifications({
        page,
        perPage: 20,
        unread: unreadOnly || undefined,
      })
      setItems(response.data)
      if (response.meta) setMeta(response.meta)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || NOTIFICATION_LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [page, unreadOnly])

  useEffect(() => {
    void load()
  }, [load])

  const markOne = async (id: string) => {
    await notificationsService.markNotificationRead(id)
    await load()
  }

  const markAll = async () => {
    await readLock.run(async () => {
      await notificationsService.markAllNotificationsRead()
      await load()
    })
  }

  const openItem = async (item: NotificationItem) => {
    await notificationsService.markNotificationRead(item.id)
    if (item.ticketId) navigate(`/tickets/${item.ticketId}`)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${!unreadOnly ? 'bg-primary text-white' : 'border border-border'}`}
          onClick={() => {
            setUnreadOnly(false)
            setPage(1)
          }}
        >
          Todas
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${unreadOnly ? 'bg-primary text-white' : 'border border-border'}`}
          onClick={() => {
            setUnreadOnly(true)
            setPage(1)
          }}
        >
          No leídas
        </button>
        <SecondaryButton type="button" className="ml-auto" onClick={() => void markAll()}>
          Marcar todas como leídas
        </SecondaryButton>
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && <p className="text-sm text-muted">Cargando notificaciones…</p>}
      {!loading && !error && items.length === 0 && (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          {unreadOnly ? NOTIFICATION_EMPTY_UNREAD : NOTIFICATION_EMPTY}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className={`rounded-lg border border-border bg-surface p-4 ${item.readAt ? '' : 'ring-1 ring-primary/30'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button type="button" className="min-w-0 text-left" onClick={() => void openItem(item)}>
                <p className="font-medium text-text">
                  <span>{item.title}</span>
                  <span className="sr-only">{item.readAt ? ', leída' : ', no leída'}</span>
                </p>
                <p className="mt-1 text-sm text-muted">{item.message}</p>
                <p className="mt-1 text-xs text-muted">{formatRelativeTime(item.createdAt)}</p>
              </button>
              {!item.readAt && (
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => void markOne(item.id)}
                >
                  Marcar como leída
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Anterior
          </button>
          <span>
            Página {meta.page} de {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((value) => Math.min(meta.totalPages, value + 1))}
          >
            Siguiente
          </button>
        </div>
      )}
      <p className="mt-6 text-sm">
        <Link to="/tickets" className="text-primary hover:underline">
          Volver a tickets
        </Link>
      </p>
    </div>
  )
}
