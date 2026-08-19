import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SurfaceCard } from '@/components/common/SurfaceCard'
import { TICKET_FLOW_COPY } from '@/pages/tickets/ticket-flow-copy'
import type { TicketStatus } from '@/types/ticket.types'
import {
  clampFlowZoom,
  displayValue,
  FLOW_LAYOUT,
  flowContentSize,
  formatFlowDate,
  formatFlowTime,
  getEventTypeLabel,
  layoutFlow,
  type FlowEvent,
} from '@/utils/ticket-flow'
import { TICKET_STATUS_LABELS } from '@/utils/reports'

type ViewMode = 'map' | 'timeline'

interface TicketFlowViewProps {
  events: FlowEvent[]
  currentEventId: string | null
  selectedEventId: string | null
  ticketStatus: TicketStatus
  folio: string
  viewMode: ViewMode
  zoom: number
  onViewMode: (mode: ViewMode) => void
  onZoom: (value: number) => void
  onSelect: (id: string) => void
}

export function TicketFlowView({
  events,
  currentEventId,
  selectedEventId,
  ticketStatus,
  folio,
  viewMode,
  zoom,
  onViewMode,
  onZoom,
  onSelect,
}: TicketFlowViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const selected = events.find((item) => item.id === selectedEventId) ?? events.find((item) => item.isCurrent) ?? null
  const laidOut = useMemo(() => layoutFlow(events), [events])
  const size = flowContentSize(events.length)

  const focusCurrent = (behavior: ScrollBehavior = 'auto') => {
    const node = canvasRef.current?.querySelector('[data-flow-current="true"]')
    node?.scrollIntoView({ block: 'nearest', inline: 'center', behavior })
  }

  const fitView = () => {
    const width = canvasRef.current?.clientWidth ?? size.width
    const next = clampFlowZoom(width / size.width)
    onZoom(next)
    window.requestAnimationFrame(() => {
      canvasRef.current?.scrollTo({ left: 0, top: 0 })
    })
  }

  useEffect(() => {
    if (viewMode !== 'map') return
    window.requestAnimationFrame(() => focusCurrent('auto'))
  }, [currentEventId, viewMode])

  useEffect(() => {
    if (viewMode !== 'timeline' || !selectedEventId) return
    document
      .querySelector(`[data-flow-timeline="${selectedEventId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }, [selectedEventId, viewMode])

  return (
    <div className="grid min-w-0 gap-4 overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_340px]">
      <SurfaceCard className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-page/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Recorrido del ticket {folio}</p>
            <p className="text-[11px] text-muted">
              {TICKET_FLOW_COPY.currentState}: {TICKET_STATUS_LABELS[ticketStatus]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded bg-page p-1">
              <ModeButton active={viewMode === 'map'} label="Mapa" onClick={() => onViewMode('map')} />
              <ModeButton
                active={viewMode === 'timeline'}
                label={TICKET_FLOW_COPY.timeline}
                onClick={() => onViewMode('timeline')}
              />
            </div>
            {viewMode === 'map' && (
              <div className="flex items-center gap-1 rounded border border-border bg-surface p-1">
                <IconControl label="Alejar" onClick={() => onZoom(clampFlowZoom(zoom - 0.1))}>
                  −
                </IconControl>
                <button
                  type="button"
                  onClick={fitView}
                  className="min-w-12 rounded px-1 py-1 text-[11px] font-semibold hover:bg-page"
                  aria-label={`Zoom ${Math.round(zoom * 100)} por ciento`}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <IconControl label="Acercar" onClick={() => onZoom(clampFlowZoom(zoom + 0.1))}>
                  +
                </IconControl>
                <IconControl label={TICKET_FLOW_COPY.fitView} onClick={fitView}>
                  <AppIcon name="search" className="h-3.5 w-3.5" />
                </IconControl>
                <IconControl label={TICKET_FLOW_COPY.goToCurrent} onClick={() => focusCurrent('auto')}>
                  <AppIcon name="flag" className="h-3.5 w-3.5" />
                </IconControl>
              </div>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <EmptyState title={TICKET_FLOW_COPY.emptyEvents} />
        ) : viewMode === 'map' ? (
          <div ref={canvasRef} className="ticket-flow-canvas max-h-[640px] overflow-auto">
            <div
              className="ticket-flow-scale relative origin-top-left"
              style={{
                width: size.width,
                height: size.height,
                transform: `scale(${zoom})`,
              }}
            >
              <FlowLinks events={laidOut} width={size.width} height={size.height} />
              {laidOut.map((event) => (
                <FlowNode
                  key={event.id}
                  event={event}
                  selected={event.id === selected?.id}
                  onSelect={() => onSelect(event.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <TimelineList events={events} selectedId={selected?.id ?? null} onSelect={onSelect} />
        )}
        <Legend />
      </SurfaceCard>

      <aside className="min-w-0 space-y-4">
        {selected ? <Inspector event={selected} /> : <EmptyState title={TICKET_FLOW_COPY.emptyEvents} />}
      </aside>
    </div>
  )
}

function FlowLinks({
  events,
  width,
  height,
}: {
  events: Array<FlowEvent & { x: number; y: number }>
  width: number
  height: number
}) {
  return (
    <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
      {events.slice(0, -1).map((event, index) => {
        const next = events[index + 1]
        const x1 = event.x + FLOW_LAYOUT.nodeWidth
        const y1 = event.y + FLOW_LAYOUT.nodeHeight / 2
        const x2 = next.x
        const y2 = next.y + FLOW_LAYOUT.nodeHeight / 2
        return (
          <path
            key={`${event.id}-${next.id}`}
            d={`M${x1} ${y1} C${x1 + 24} ${y1} ${x2 - 24} ${y2} ${x2} ${y2}`}
            fill="none"
            stroke={event.lane === 'exception' || next.lane === 'exception' ? 'var(--color-warning)' : 'var(--color-primary)'}
            strokeWidth="2"
            strokeDasharray={next.isPending ? '6 6' : undefined}
          />
        )
      })}
    </svg>
  )
}

function FlowNode({
  event,
  selected,
  onSelect,
}: {
  event: FlowEvent & { x: number; y: number }
  selected: boolean
  onSelect: () => void
}) {
  const tone =
    event.kind === 'current'
      ? 'border-2 border-primary bg-surface font-semibold shadow-sm ticket-flow-node-active'
      : event.kind === 'completed'
        ? 'border border-primary/40 bg-surface'
        : event.kind === 'exception'
          ? 'border border-warning bg-warning/5'
          : 'border border-dashed border-slate-300 bg-page text-muted'

  return (
    <button
      type="button"
      data-flow-current={event.isCurrent ? 'true' : undefined}
      aria-current={event.isCurrent ? 'step' : undefined}
      aria-pressed={selected}
      aria-label={`${event.title}. ${event.kindLabel}${event.isCurrent ? '. Estado actual' : ''}`}
      onClick={onSelect}
      className={`absolute rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-primary ${tone} ${selected ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
      style={{ left: event.x, top: event.y, width: FLOW_LAYOUT.nodeWidth, minHeight: FLOW_LAYOUT.nodeHeight }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{event.kindLabel}</span>
        {event.isCurrent ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Actual
          </span>
        ) : event.kind === 'completed' ? (
          <AppIcon name="check" className="h-4 w-4 text-primary" />
        ) : event.kind === 'exception' ? (
          <AppIcon name="priority" className="h-4 w-4 text-warning" />
        ) : null}
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-semibold leading-5 text-text">{event.title}</p>
        <p className="mt-1 text-[11px] text-muted">{event.isPending ? 'Sin fecha' : formatFlowTime(event.occurredAt)}</p>
        <p className="mt-1 truncate text-[11px] text-text" title={event.actorName ?? undefined}>
          {displayValue(event.actorName)}
        </p>
      </div>
    </button>
  )
}

function TimelineList({
  events,
  selectedId,
  onSelect,
}: {
  events: FlowEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <ol className="max-h-[640px] space-y-3 overflow-y-auto bg-page p-4 md:p-6">
      {events.map((event, index) => (
        <li key={event.id}>
          <button
            type="button"
            data-flow-timeline={event.id}
            onClick={() => onSelect(event.id)}
            aria-current={event.isCurrent ? 'step' : undefined}
            className={`grid w-full gap-3 rounded border bg-surface p-4 text-left sm:grid-cols-[auto_1fr_auto] ${selectedId === event.id ? 'border-slate-400 ring-2 ring-slate-300' : 'border-border'} ${event.isCurrent ? 'border-primary' : ''}`}
          >
            <span className="text-[10px] font-semibold text-muted">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`text-sm ${event.isCurrent ? 'font-bold' : 'font-semibold'}`}>{event.title}</h3>
                <span className="rounded-full bg-page px-2 py-0.5 text-[9px] font-semibold uppercase">{event.kindLabel}</span>
                {event.isCurrent ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                    Actual
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted">{event.description}</p>
              <p className="mt-2 text-[11px] text-text">
                {displayValue(event.actorName)} ·{' '}
                {event.isPending ? event.sourceLabel : getEventTypeLabel(event.technicalEvent)}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold">{event.occurredAt ? formatFlowDate(event.occurredAt) : MISSING_PLACEHOLDER}</p>
              <p className="text-muted">{event.occurredAt ? formatFlowTime(event.occurredAt) : displayValue(null)}</p>
              <p className="mt-1 text-muted">{event.durationLabel}</p>
            </div>
          </button>
        </li>
      ))}
    </ol>
  )
}

const MISSING_PLACEHOLDER = displayValue(null)

function Inspector({ event }: { event: FlowEvent }) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Inspector de evento</p>
        <span className="rounded-full bg-page px-2 py-1 text-[10px] font-semibold uppercase">{event.kindLabel}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{event.title}</h3>
      {event.ticketStatus ? <div className="mt-2"><StatusBadge status={event.ticketStatus} /></div> : null}
      <p className="mt-3 text-sm leading-6 text-text">{event.description}</p>
      <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
        <Meta label="Etapa" value={event.title} />
        <Meta label="Estado" value={event.kindLabel} />
        <Meta label="Responsable" value={displayValue(event.actorName)} />
        <Meta label="Fecha" value={formatFlowDate(event.occurredAt)} />
        <Meta label="Hora" value={formatFlowTime(event.occurredAt)} />
        <Meta label={TICKET_FLOW_COPY.duration} value={event.durationLabel} />
        <Meta label="Origen" value={event.sourceLabel} />
      </dl>
      <div className="mt-4 rounded bg-page p-3">
        <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-muted">
          {TICKET_FLOW_COPY.eventType}
        </p>
        <p className="mt-1 text-sm font-semibold text-primary">{getEventTypeLabel(event.technicalEvent)}</p>
      </div>
    </SurfaceCard>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 border-t border-border px-4 py-3 text-[11px] text-muted">
      <LegendItem className="bg-primary" label="Completado" />
      <LegendItem className="border-2 border-primary bg-surface" label="Actual" />
      <LegendItem className="border border-dashed border-slate-400 bg-page" label="Pendiente" />
      <LegendItem className="border border-warning bg-warning/20" label="Excepción" />
      <LegendItem className="ring-2 ring-slate-400" label="Seleccionado" />
    </div>
  )
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${className}`} />
      {label}
    </span>
  )
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-[11px] font-semibold ${active ? 'bg-surface text-primary' : 'text-muted'}`}
    >
      {label}
    </button>
  )
}

function IconControl({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded text-sm font-semibold hover:bg-page focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </button>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
