import Link from 'next/link'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SLA_COLORS, SLA_LABELS } from '@/utils/sla.utils'
import type { DashboardTicketSummary } from '@/types/dashboard.types'

interface DashboardTicketListProps {
  title: string
  tickets: DashboardTicketSummary[]
  emptyTitle: string
  emptyDescription?: string
  viewAllHref?: string
}

export function DashboardTicketList({
  title,
  tickets,
  emptyTitle,
  emptyDescription,
  viewAllHref,
}: DashboardTicketListProps) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-xs font-medium text-brand-teal hover:underline">
            Ver todos
          </Link>
        )}
      </div>
      {tickets.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className="flex flex-col gap-2 px-1 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-navy">
                    <span className="font-mono text-xs text-slate-500">{ticket.folio}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    {ticket.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ticket.priorityName}
                    {ticket.assigneeName ? ` · ${ticket.assigneeName}` : ' · Sin agente'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <span
                    className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${SLA_COLORS[ticket.slaLevel]}`}
                  >
                    {SLA_LABELS[ticket.slaLevel]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
