import { Link } from 'react-router-dom'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { SlaSemaphore } from '@/components/tickets/SlaSemaphore'
import type { Ticket, TicketStatus } from '@/types/ticket.types'
import { calculateSlaStatus } from '@/utils/sla.utils'

const KANBAN_COLUMNS: { status: TicketStatus; label: string; accent: string }[] = [
  { status: 'OPEN', label: 'Abierto', accent: 'bg-status-open' },
  { status: 'ASSIGNED', label: 'Asignado', accent: 'bg-status-assigned' },
  { status: 'IN_PROGRESS', label: 'En proceso', accent: 'bg-status-in-progress' },
  { status: 'WAITING_USER', label: 'En espera', accent: 'bg-status-waiting-user' },
  { status: 'ESCALATED', label: 'Escalado', accent: 'bg-status-escalated' },
  { status: 'RESOLVED', label: 'Resuelto', accent: 'bg-status-resolved' },
  { status: 'CLOSED', label: 'Cerrado', accent: 'bg-status-closed' },
  { status: 'CANCELLED', label: 'Cancelado', accent: 'bg-status-cancelled' },
]

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

interface TicketsKanbanBoardProps {
  tickets: Ticket[]
  loading?: boolean
}

export function TicketsKanbanBoard({ tickets, loading = false }: TicketsKanbanBoardProps) {
  if (loading) {
    return <LoadingSkeleton rows={4} />
  }

  const byStatus = KANBAN_COLUMNS.map((column) => ({
    ...column,
    items: tickets.filter((ticket) => ticket.status === column.status),
  }))

  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3 px-1">
        {byStatus.map((column) => (
          <section
            key={column.status}
            className="flex w-72 shrink-0 flex-col rounded-2xl border border-[#e2dce5] bg-[#f3f0f6]/80"
          >
            <header className="flex items-center gap-2 border-b border-[#e2dce5]/80 px-3 py-3">
              <span className={`h-2 w-2 rounded-full ${column.accent}`} aria-hidden />
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-brand-navy">
                {column.label}
              </h3>
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#766c7c] shadow-sm">
                {column.items.length}
              </span>
            </header>

            <div className="flex max-h-[calc(100vh-22rem)] min-h-48 flex-col gap-2.5 overflow-y-auto p-2.5">
              {column.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#d9d1dd] px-3 py-6 text-center text-xs text-[#8c8191]">
                  Sin tickets
                </p>
              ) : (
                column.items.map((ticket) => {
                  const sla = calculateSlaStatus(
                    ticket.createdAt,
                    ticket.slaDueAt,
                    ticket.resolutionHours,
                  )

                  return (
                    <Link
                      key={ticket.id}
                      to={`/tickets/${ticket.id}`}
                      className="block rounded-xl border border-[#e2dce5] bg-white p-3 shadow-[0_6px_16px_rgba(61,45,69,.05)] transition hover:-translate-y-0.5 hover:border-brand-teal/40 hover:shadow-[0_10px_22px_rgba(111,79,216,.12)]"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-brand-navy">
                          {ticket.title}
                        </p>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-[#efeaff] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-teal">
                          {ticket.folio}
                        </span>
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            color: ticket.priorityColor || '#6f4fd8',
                            backgroundColor: `${ticket.priorityColor || '#6f4fd8'}18`,
                          }}
                        >
                          {ticket.priorityName}
                        </span>
                        <span className="rounded-md bg-[#f4f1f6] px-1.5 py-0.5 text-[10px] font-medium text-[#766c7c]">
                          {ticket.categoryName}
                        </span>
                      </div>

                      <div className="mb-3">
                        <SlaSemaphore sla={sla} compact />
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-[#f0ebf2] pt-2.5">
                        <p className="truncate text-[11px] text-[#8c8191]">
                          {ticket.assigneeName
                            ? `Agente: ${ticket.assigneeName}`
                            : 'Sin asignar'}
                        </p>
                        <span
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[10px] font-bold text-white"
                          title={ticket.assigneeName || ticket.requesterName}
                        >
                          {getInitials(ticket.assigneeName || ticket.requesterName)}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
