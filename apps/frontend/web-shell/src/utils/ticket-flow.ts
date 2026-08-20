import type { Ticket, TicketStatus, TicketStatusHistory } from '@/types/ticket.types'
import { TICKET_STATUS_LABELS } from '@/utils/reports'
import { TRANSITIONS } from '@/utils/ticket-state-machine'

export const MISSING_VALUE = 'No disponible'
export const DURATION_IN_PROGRESS = 'En curso'

export type FlowKind = 'completed' | 'current' | 'pending' | 'exception'
export type FlowLane = 'main' | 'exception'

export interface FlowEvent {
  id: string
  ticketId: string
  title: string
  kind: FlowKind
  lane: FlowLane
  isTransition: boolean
  isCurrent: boolean
  isPending: boolean
  occurredAt: string | null
  actorName: string | null
  durationLabel: string
  sourceLabel: string
  technicalEvent: string
  description: string
  kindLabel: string
  ticketStatus: TicketStatus | null
  oldStatus: TicketStatus | null
  reason: string | null
}

export interface FlowModel {
  events: FlowEvent[]
  currentEventId: string | null
  ticketStatus: TicketStatus
}

export const FLOW_LAYOUT = {
  nodeWidth: 200,
  nodeHeight: 128,
  gapX: 56,
  mainY: 72,
  exceptionY: 268,
  padding: 32,
}

export const FLOW_ZOOM = { min: 0.45, max: 1.25, default: 0.85 }

const EXCEPTION_STATUSES: TicketStatus[] = ['WAITING_USER', 'ESCALATED', 'CANCELLED']
const TERMINAL_STATUSES: TicketStatus[] = ['CLOSED', 'CANCELLED']
const ACTIVE_STATUSES: TicketStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_USER', 'ESCALATED']

export const UNKNOWN_EVENT_TYPE_LABEL = 'Evento del sistema'

const EVENT_TYPE_LABELS: Record<string, string> = {
  CREATED: 'Creación del ticket',
  ASSIGNED: 'Asignación del ticket',
  REASSIGNED: 'Reasignación del ticket',
  STATUS_CHANGED: 'Cambio de estado',
  PRIORITY_CHANGED: 'Cambio de prioridad',
  UPDATED: 'Actualización del ticket',
}

export const TICKET_FLOW_STATUS_FILTERS = ['ALL', 'ACTIVE', 'RESOLVED', 'CLOSED', 'CANCELLED'] as const
export type TicketFlowStatusFilter = (typeof TICKET_FLOW_STATUS_FILTERS)[number]

export const TICKET_FLOW_STATUS_FILTER_LABELS: Record<TicketFlowStatusFilter, string> = {
  ALL: 'Todos',
  ACTIVE: 'Activos',
  RESOLVED: 'Resueltos',
  CLOSED: 'Cerrados',
  CANCELLED: 'Cancelados',
}

export function getEventTypeLabel(eventType?: string | null) {
  if (eventType == null || eventType === '' || eventType === MISSING_VALUE) return MISSING_VALUE
  return EVENT_TYPE_LABELS[eventType] ?? UNKNOWN_EVENT_TYPE_LABEL
}

export function isActiveTicketStatus(status: TicketStatus) {
  return ACTIVE_STATUSES.includes(status)
}

export function matchesTicketStatusFilter(
  ticket: Pick<Ticket, 'status'>,
  selectedFilter: TicketFlowStatusFilter,
) {
  switch (selectedFilter) {
    case 'ALL':
      return true
    case 'ACTIVE':
      return isActiveTicketStatus(ticket.status)
    case 'RESOLVED':
      return ticket.status === 'RESOLVED'
    case 'CLOSED':
      return ticket.status === 'CLOSED'
    case 'CANCELLED':
      return ticket.status === 'CANCELLED'
  }
}

export function filterTicketsByStatus<T extends Pick<Ticket, 'status'>>(
  tickets: T[],
  selectedFilter: TicketFlowStatusFilter,
) {
  return tickets.filter((ticket) => matchesTicketStatusFilter(ticket, selectedFilter))
}

export function filterTicketsByQuery<T extends Pick<Ticket, 'folio' | 'title'>>(tickets: T[], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return tickets
  return tickets.filter(
    (ticket) => ticket.folio.toLowerCase().includes(needle) || ticket.title.toLowerCase().includes(needle),
  )
}

export function countTicketsByStatusFilter(tickets: Array<Pick<Ticket, 'status'>>) {
  return Object.fromEntries(
    TICKET_FLOW_STATUS_FILTERS.map((filter) => [
      filter,
      tickets.filter((ticket) => matchesTicketStatusFilter(ticket, filter)).length,
    ]),
  ) as Record<TicketFlowStatusFilter, number>
}

const KIND_LABELS: Record<FlowKind, string> = {
  completed: 'Completada',
  current: 'Actual',
  pending: 'Pendiente',
  exception: 'Excepción',
}

export function sortTicketHistory(history: TicketStatusHistory[]): TicketStatusHistory[] {
  return [...history].sort((a, b) => {
    const time = toTime(a.createdAt) - toTime(b.createdAt)
    if (time !== 0) return time
    return a.id.localeCompare(b.id)
  })
}

export function inferEventType(item: TicketStatusHistory): string {
  if (item.eventType) return item.eventType
  if (!item.oldStatus && item.newStatus === 'OPEN') return 'CREATED'
  if (item.oldStatus !== item.newStatus) {
    if (item.newStatus === 'ASSIGNED') return 'ASSIGNED'
    return 'STATUS_CHANGED'
  }
  return 'UPDATED'
}

export function isStatusTransition(item: TicketStatusHistory): boolean {
  const type = inferEventType(item)
  if (type === 'PRIORITY_CHANGED') return false
  if (type === 'REASSIGNED' && item.oldStatus === item.newStatus) return false
  return item.oldStatus !== item.newStatus || type === 'CREATED'
}

export function isExceptionEvent(item: TicketStatusHistory): boolean {
  const type = inferEventType(item)
  if (type === 'REASSIGNED') return true
  if (EXCEPTION_STATUSES.includes(item.newStatus)) return true
  if (
    (item.oldStatus === 'CLOSED' || item.oldStatus === 'RESOLVED') &&
    item.newStatus === 'IN_PROGRESS'
  ) {
    return true
  }
  return false
}

export function pendingStatuses(current: TicketStatus): TicketStatus[] {
  if (TERMINAL_STATUSES.includes(current)) return []
  return (TRANSITIONS[current] ?? []).filter((status) => {
    if (status === 'CANCELLED' || status === 'ESCALATED' || status === 'WAITING_USER') return false
    if (current === 'RESOLVED' && status === 'IN_PROGRESS') return false
    return true
  })
}

export function formatFlowDate(value?: string | null): string {
  const date = parseDate(value)
  if (!date) return MISSING_VALUE
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date)
}

export function formatFlowTime(value?: string | null): string {
  const date = parseDate(value)
  if (!date) return MISSING_VALUE
  return new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' }).format(date)
}

export function formatFlowDuration(from?: string | null, to?: string | null, open = false): string {
  if (open && from) return DURATION_IN_PROGRESS
  if (!from || !to) return MISSING_VALUE
  const start = parseDate(from)
  const end = parseDate(to)
  if (!start || !end) return MISSING_VALUE
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export function displayValue(value?: string | null): string {
  if (value == null || value === '' || value === 'undefined' || value === 'null' || value === 'NaN') {
    return MISSING_VALUE
  }
  return value
}

export function clampFlowZoom(value: number) {
  return Math.min(FLOW_ZOOM.max, Math.max(FLOW_ZOOM.min, value))
}

export function createSequenceGuard() {
  let current = 0
  return {
    next() {
      current += 1
      const token = current
      return {
        isLatest() {
          return token === current
        },
      }
    },
  }
}

export function buildFlowModel(ticket: Pick<Ticket, 'id' | 'status' | 'statusHistory'>): FlowModel {
  const history = sortTicketHistory(ticket.statusHistory ?? [])
  const terminal = TERMINAL_STATUSES.includes(ticket.status)
  const currentHistory = [...history].reverse().find((item) => {
    if (!isStatusTransition(item)) return false
    return item.newStatus === ticket.status
  })
  const currentEventId = currentHistory?.id ?? history.at(-1)?.id ?? null

  const realEvents: FlowEvent[] = history.map((item, index) => {
    const next = history[index + 1]
    const technicalEvent = inferEventType(item)
    const exception = isExceptionEvent(item)
    const isCurrent = item.id === currentEventId
    const kind: FlowKind = exception && !isCurrent ? 'exception' : isCurrent ? 'current' : 'completed'
    const openDuration = isCurrent && !terminal && !next
    return {
      id: item.id,
      ticketId: ticket.id,
      title: eventTitle(item, technicalEvent),
      kind,
      lane: exception ? 'exception' : 'main',
      isTransition: isStatusTransition(item),
      isCurrent,
      isPending: false,
      occurredAt: item.createdAt,
      actorName: item.changedByName || null,
      durationLabel: formatFlowDuration(item.createdAt, next?.createdAt, openDuration),
      sourceLabel: 'Historial',
      technicalEvent,
      description: eventDescription(item, technicalEvent),
      kindLabel: KIND_LABELS[kind],
      ticketStatus: item.newStatus,
      oldStatus: item.oldStatus,
      reason: item.reason ?? null,
    }
  })

  const pendingEvents: FlowEvent[] = pendingStatuses(ticket.status).map((status) => ({
    id: `pending:${ticket.id}:${status}`,
    ticketId: ticket.id,
    title: TICKET_STATUS_LABELS[status],
    kind: 'pending',
    lane: 'main',
    isTransition: false,
    isCurrent: false,
    isPending: true,
    occurredAt: null,
    actorName: null,
    durationLabel: MISSING_VALUE,
    sourceLabel: 'Transición prevista',
    technicalEvent: MISSING_VALUE,
    description: `Siguiente etapa válida del proceso: ${TICKET_STATUS_LABELS[status]}.`,
    kindLabel: KIND_LABELS.pending,
    ticketStatus: status,
    oldStatus: ticket.status,
    reason: null,
  }))

  return {
    events: [...realEvents, ...pendingEvents],
    currentEventId,
    ticketStatus: ticket.status,
  }
}

export function layoutFlow(events: FlowEvent[]) {
  return events.map((event, index) => ({
    ...event,
    x: FLOW_LAYOUT.padding + index * (FLOW_LAYOUT.nodeWidth + FLOW_LAYOUT.gapX),
    y: event.lane === 'exception' ? FLOW_LAYOUT.exceptionY : FLOW_LAYOUT.mainY,
  }))
}

export function flowContentSize(count: number) {
  const nodes = Math.max(1, count)
  return {
    width:
      FLOW_LAYOUT.padding * 2 +
      nodes * FLOW_LAYOUT.nodeWidth +
      Math.max(0, nodes - 1) * FLOW_LAYOUT.gapX,
    height: FLOW_LAYOUT.exceptionY + FLOW_LAYOUT.nodeHeight + FLOW_LAYOUT.padding,
  }
}

function eventTitle(item: TicketStatusHistory, type: string) {
  if (type === 'PRIORITY_CHANGED') return 'Prioridad actualizada'
  if (type === 'REASSIGNED') return 'Reasignación'
  if (type === 'CREATED') return TICKET_STATUS_LABELS.OPEN
  return TICKET_STATUS_LABELS[item.newStatus]
}

function eventDescription(item: TicketStatusHistory, type: string) {
  if (item.reason) return item.reason
  if (type === 'CREATED') return 'El ticket ingresó al sistema y quedó en estado abierto.'
  if (type === 'ASSIGNED') return 'Se asignó un responsable al ticket.'
  if (type === 'REASSIGNED') return 'El ticket cambió de responsable.'
  if (type === 'PRIORITY_CHANGED') return 'Se actualizó la prioridad del ticket.'
  if (item.oldStatus) {
    return `El estado cambió de ${TICKET_STATUS_LABELS[item.oldStatus]} a ${TICKET_STATUS_LABELS[item.newStatus]}.`
  }
  return `El ticket quedó en ${TICKET_STATUS_LABELS[item.newStatus]}.`
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toTime(value: string) {
  const date = parseDate(value)
  return date ? date.getTime() : 0
}
