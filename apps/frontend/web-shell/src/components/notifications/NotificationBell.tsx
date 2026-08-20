import Link from 'next/link'
import { useAppNavigate } from '@/hooks/useAppNavigate'
import { useEffect, useId, useRef, useState } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { useNotifications } from '@/hooks/useNotifications'
import {
  formatRelativeTime,
  NOTIFICATION_EMPTY,
  NOTIFICATION_LOAD_ERROR,
  recentNotifications,
  unreadBadgeLabel,
} from '@/utils/notifications'

export function NotificationBell() {
  const navigate = useAppNavigate()
  const { items, unreadCount, loading, error, refresh, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const badge = unreadBadgeLabel(unreadCount)
  const recent = recentNotifications(items)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const handleSelect = async (id: string, ticketId: string | null) => {
    try {
      await markRead(id)
    } catch {
      /* la navegación sigue; el backend es idempotente */
    }
    setOpen(false)
    if (ticketId) navigate(`/tickets/${ticketId}`)
    else navigate('/notifications')
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="relative grid h-9 w-9 place-items-center rounded border border-border bg-surface text-text hover:bg-page"
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={menuId}
        onClick={() => {
          setOpen((value) => {
            const next = !value
            if (next) void refresh()
            return next
          })
        }}
      >
        <AppIcon name="bell" className="h-4 w-4" />
        {badge && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white">
            <span className="sr-only">{unreadCount} no leídas. </span>
            {badge}
          </span>
        )}
        {unreadCount > 0 && <span className="sr-only">Hay notificaciones nuevas.</span>}
      </button>
      {open && (
        <div
          id={menuId}
          role="dialog"
          aria-label="Notificaciones recientes"
          className="absolute right-0 z-50 mt-1 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded border border-border bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notificaciones</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline disabled:text-muted"
                disabled={unreadCount === 0}
                onClick={() => void markAllRead()}
              >
                Marcar todas como leídas
              </button>
              <button
                type="button"
                aria-label="Cerrar"
                className="rounded p-1 text-muted hover:bg-page hover:text-text"
                onClick={() => {
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
              >
                <AppIcon name="x" className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 && <p className="px-3 py-6 text-sm text-muted">Cargando notificaciones…</p>}
            {error && (
              <div className="px-3 py-4 text-sm">
                <p className="text-danger">{NOTIFICATION_LOAD_ERROR}</p>
                <button type="button" className="mt-2 text-primary hover:underline" onClick={() => void refresh()}>
                  Reintentar
                </button>
              </div>
            )}
            {!loading && !error && recent.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted">{NOTIFICATION_EMPTY}</p>
            )}
            {recent.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`block w-full border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-page ${item.readAt ? 'opacity-80' : 'bg-primary/5'}`}
                onClick={() => void handleSelect(item.id, item.ticketId)}
              >
                <span className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'border border-muted' : 'bg-primary'}`}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-sm font-medium text-text">
                      <span>{item.title}</span>
                      <span className="sr-only">{item.readAt ? ', leída' : ', no leída'}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{item.message}</span>
                    <span className="mt-1 block text-[11px] text-muted">{formatRelativeTime(item.createdAt)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-border px-3 py-2">
            <Link
              href="/notifications"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
