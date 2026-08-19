import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SurfaceCard } from '@/components/common/SurfaceCard'
import { SecondaryButton } from '@/components/common/UiControls'
import { TicketFlowView } from '@/components/tickets/TicketFlowView'
import { TICKET_FLOW_COPY } from '@/pages/tickets/ticket-flow-copy'
import * as ticketService from '@/services/ticket.service'
import type { Ticket } from '@/types/ticket.types'
import {
  buildFlowModel,
  countTicketsByStatusFilter,
  createSequenceGuard,
  filterTicketsByStatus,
  FLOW_ZOOM,
  matchesTicketStatusFilter,
  TICKET_FLOW_STATUS_FILTER_LABELS,
  TICKET_FLOW_STATUS_FILTERS,
  type TicketFlowStatusFilter,
} from '@/utils/ticket-flow'
import { TICKET_STATUS_LABELS } from '@/utils/reports'

type ViewMode = 'map' | 'timeline'

const TICKET_PAGE_SIZE = 100

async function loadAccessibleTickets() {
  const first = await ticketService.getTickets({ page: 1, perPage: TICKET_PAGE_SIZE })
  const tickets = [...first.data]
  const totalPages = first.meta?.totalPages ?? 1
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await ticketService.getTickets({ page, perPage: TICKET_PAGE_SIZE })
    tickets.push(...next.data)
  }
  return tickets
}

export function TicketFlowPage() {
  const { id: routeId } = useParams<{ id: string }>()
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([])
  const [statusFilter, setStatusFilter] = useState<TicketFlowStatusFilter>('ALL')
  const [selectedTicketId, setSelectedTicketId] = useState(routeId ?? '')
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(!routeId)
  const [error, setError] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(FLOW_ZOOM.default)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const guard = useRef(createSequenceGuard())

  const filteredTickets = useMemo(
    () => filterTicketsByStatus(availableTickets, statusFilter),
    [availableTickets, statusFilter],
  )
  const filterCounts = useMemo(() => countTicketsByStatusFilter(availableTickets), [availableTickets])

  const clearSelection = useCallback(() => {
    guard.current.next()
    setSelectedTicketId('')
    setTicket(null)
    setSelectedEventId(null)
    setError('')
    setLoading(false)
    setZoom(FLOW_ZOOM.default)
    setViewMode('map')
  }, [])

  const loadTicket = useCallback(async (ticketId: string) => {
    const request = guard.current.next()
    setLoading(true)
    setError('')
    setTicket(null)
    setSelectedEventId(null)
    try {
      const ticketData = await ticketService.getTicketById(ticketId)
      if (!request.isLatest()) return
      setTicket(ticketData)
      const model = buildFlowModel(ticketData)
      setSelectedEventId(model.currentEventId)
    } catch (err: unknown) {
      if (!request.isLatest()) return
      setTicket(null)
      setError((err as { message?: string }).message || TICKET_FLOW_COPY.errorHistory)
    } finally {
      if (request.isLatest()) setLoading(false)
    }
  }, [])

  const initialize = useCallback(async () => {
    if (routeId) {
      setSelectedTicketId(routeId)
      await loadTicket(routeId)
      return
    }
    setListLoading(true)
    setLoading(true)
    try {
      const tickets = await loadAccessibleTickets()
      setAvailableTickets(tickets)
      if (!tickets.length) {
        setSelectedTicketId('')
        setTicket(null)
        setLoading(false)
        return
      }
      const firstId = tickets[0].id
      setSelectedTicketId(firstId)
      await loadTicket(firstId)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || TICKET_FLOW_COPY.errorHistory)
      setLoading(false)
    } finally {
      setListLoading(false)
    }
  }, [loadTicket, routeId])

  useEffect(() => {
    void initialize()
  }, [initialize])

  const model = useMemo(() => (ticket ? buildFlowModel(ticket) : null), [ticket])

  const handleTicketChange = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setZoom(FLOW_ZOOM.default)
    setViewMode('map')
    if (!ticketId) {
      clearSelection()
      return
    }
    void loadTicket(ticketId)
  }

  const handleStatusFilter = (next: TicketFlowStatusFilter) => {
    setStatusFilter(next)
    if (!selectedTicketId) return
    const selected = availableTickets.find((item) => item.id === selectedTicketId)
    if (!selected || !matchesTicketStatusFilter(selected, next)) {
      clearSelection()
    }
  }

  const showSelector = !routeId
  const waiting = listLoading || (loading && Boolean(selectedTicketId))

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <PageHeader
        kicker="Mesa de ayuda"
        title="Flujo visual"
        description="Historial real del ticket: etapas recorridas, estado actual, excepciones y responsables."
        actions={
          showSelector ? (
            <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-end">
              <StatusFilterControl
                value={statusFilter}
                counts={filterCounts}
                onChange={handleStatusFilter}
              />
              <label className="min-w-[220px] flex-1">
                <span className="sr-only">Seleccionar ticket</span>
                <select
                  value={selectedTicketId}
                  onChange={(event) => handleTicketChange(event.target.value)}
                  className="w-full rounded border border-border bg-surface px-3.5 py-2 text-sm font-medium"
                >
                  <option value="">{TICKET_FLOW_COPY.selectTicket}</option>
                  {filteredTickets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.folio} · {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null
        }
      />

      {waiting ? (
        <LoadingSkeleton variant="flow" label={TICKET_FLOW_COPY.loadingHistory} delayed={false} />
      ) : error ? (
        <ErrorState message={error || TICKET_FLOW_COPY.errorHistory} onRetry={() => void initialize()} />
      ) : showSelector && filteredTickets.length === 0 ? (
        <EmptyState
          title={TICKET_FLOW_COPY.noFilterResults}
          action={
            <SecondaryButton type="button" onClick={() => handleStatusFilter('ALL')}>
              {TICKET_FLOW_COPY.viewAll}
            </SecondaryButton>
          }
        />
      ) : !selectedTicketId ? (
        <EmptyState title={TICKET_FLOW_COPY.selectTicket} />
      ) : !ticket || !model ? (
        <ErrorState message="Ticket no encontrado" onRetry={() => void initialize()} />
      ) : (
        <>
          <SurfaceCard className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {TICKET_FLOW_COPY.currentState}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">{ticket.folio}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <h2 className="mt-2 text-xl font-semibold text-text">{ticket.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {TICKET_STATUS_LABELS[ticket.status]} · {ticket.requesterName}
                  {ticket.assigneeName ? ` · ${ticket.assigneeName}` : ''}
                </p>
              </div>
              <p className="text-sm text-muted">
                {model.events.filter((item) => !item.isPending).length} eventos reales
              </p>
            </div>
          </SurfaceCard>

          {model.events.filter((item) => !item.isPending).length === 0 ? (
            <EmptyState title={TICKET_FLOW_COPY.emptyEvents} />
          ) : (
            <TicketFlowView
              events={model.events}
              currentEventId={model.currentEventId}
              selectedEventId={selectedEventId}
              ticketStatus={ticket.status}
              folio={ticket.folio}
              viewMode={viewMode}
              zoom={zoom}
              onViewMode={setViewMode}
              onZoom={setZoom}
              onSelect={setSelectedEventId}
            />
          )}
        </>
      )}
    </div>
  )
}

function StatusFilterControl({
  value,
  counts,
  onChange,
}: {
  value: TicketFlowStatusFilter
  counts: Record<TicketFlowStatusFilter, number>
  onChange: (value: TicketFlowStatusFilter) => void
}) {
  return (
    <div className="min-w-0">
      <p
        id="ticket-flow-status-filter-label"
        className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        {TICKET_FLOW_COPY.statusFilter}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="ticket-flow-status-filter-label"
        className="flex flex-wrap rounded border border-border bg-page p-1"
      >
        {TICKET_FLOW_STATUS_FILTERS.map((filter, index) => {
          const selected = value === filter
          return (
            <button
              key={filter}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(filter)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                event.preventDefault()
                const delta = event.key === 'ArrowRight' ? 1 : -1
                const next =
                  TICKET_FLOW_STATUS_FILTERS[
                    (index + delta + TICKET_FLOW_STATUS_FILTERS.length) % TICKET_FLOW_STATUS_FILTERS.length
                  ]
                onChange(next)
                window.requestAnimationFrame(() => {
                  document
                    .querySelector<HTMLButtonElement>(`[data-ticket-flow-filter="${next}"]`)
                    ?.focus()
                })
              }}
              data-ticket-flow-filter={filter}
              className={`rounded px-2.5 py-1.5 text-[11px] font-semibold ${
                selected ? 'bg-primary text-white' : 'text-muted hover:bg-surface'
              }`}
            >
              {TICKET_FLOW_STATUS_FILTER_LABELS[filter]} ({counts[filter]})
            </button>
          )
        })}
      </div>
    </div>
  )
}
