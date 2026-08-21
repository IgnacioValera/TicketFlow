import type { TicketStatusHistory } from '@/types/ticket.types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EventContextCard } from '@/components/tickets/EventContextCard'
import { buildEventContext } from '@/utils/ticket-event-context'

interface TicketTimelineProps {
  history: TicketStatusHistory[]
}

export function TicketTimeline({ history }: TicketTimelineProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  if (sorted.length === 0) {
    return <p className="text-sm text-slate-500">Sin historial de cambios.</p>
  }

  return (
    <ol className="relative space-y-4 border-l border-brand-slate/40 pl-4">
      {sorted.map((item) => {
        const context = buildEventContext(item)
        return (
          <li key={item.id} className="relative min-w-0">
            <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-brand-teal" />
            <div className="flex flex-wrap items-center gap-2">
              {item.oldStatus && <StatusBadge status={item.oldStatus} />}
              {item.oldStatus && <span className="text-slate-400">→</span>}
              <StatusBadge status={item.newStatus} />
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {item.changedByName || 'Sistema'} · {new Date(item.createdAt).toLocaleString('es-MX')}
            </p>
            {context.show ? (
              <div className="mt-2">
                <EventContextCard context={context} />
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
