import { describe, expect, it } from 'vitest'
import type { TicketStatusHistory } from '@/types/ticket.types'
import {
  buildFlowModel,
  countTicketsByStatusFilter,
  createSequenceGuard,
  displayValue,
  filterTicketsByStatus,
  formatFlowDate,
  formatFlowDuration,
  formatFlowTime,
  getEventTypeLabel,
  inferEventType,
  isActiveTicketStatus,
  matchesTicketStatusFilter,
  MISSING_VALUE,
  DURATION_IN_PROGRESS,
  pendingStatuses,
  sortTicketHistory,
  UNKNOWN_EVENT_TYPE_LABEL,
} from '@/utils/ticket-flow'

function event(partial: Partial<TicketStatusHistory> & Pick<TicketStatusHistory, 'id' | 'newStatus' | 'createdAt'>): TicketStatusHistory {
  return {
    ticketId: 't1',
    oldStatus: null,
    changedBy: '1',
    changedByName: 'Agente Soporte',
    ...partial,
  }
}

describe('Flujo visual — historial real', () => {
  it('ordena cronológicamente y usa el id como desempate estable', () => {
    const sorted = sortTicketHistory([
      event({ id: 'b', newStatus: 'ASSIGNED', createdAt: '2026-08-18T12:00:00.000Z', oldStatus: 'OPEN' }),
      event({ id: 'a', newStatus: 'OPEN', createdAt: '2026-08-18T12:00:00.000Z' }),
      event({ id: 'c', newStatus: 'IN_PROGRESS', createdAt: '2026-08-18T13:00:00.000Z', oldStatus: 'ASSIGNED' }),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('mapa y cronología usan la misma colección normalizada', () => {
    const model = buildFlowModel({
      id: 't1',
      status: 'IN_PROGRESS',
      statusHistory: [
        event({ id: 'h2', newStatus: 'ASSIGNED', oldStatus: 'OPEN', createdAt: '2026-08-18T11:00:00.000Z' }),
        event({ id: 'h1', newStatus: 'OPEN', createdAt: '2026-08-18T10:00:00.000Z' }),
        event({ id: 'h3', newStatus: 'IN_PROGRESS', oldStatus: 'ASSIGNED', createdAt: '2026-08-18T12:00:00.000Z' }),
      ],
    })
    expect(model.events.filter((item) => !item.isPending).map((item) => item.id)).toEqual(['h1', 'h2', 'h3'])
    expect(model.currentEventId).toBe('h3')
    expect(model.events.find((item) => item.id === 'h3')?.kind).toBe('current')
  })

  it('identifica el estado actual desde la entidad Ticket, no desde un nodo seleccionado', () => {
    const model = buildFlowModel({
      id: 't1',
      status: 'ASSIGNED',
      statusHistory: [
        event({ id: 'h1', newStatus: 'OPEN', createdAt: '2026-08-18T10:00:00.000Z' }),
        event({ id: 'h2', newStatus: 'ASSIGNED', oldStatus: 'OPEN', createdAt: '2026-08-18T11:00:00.000Z' }),
      ],
    })
    expect(model.ticketStatus).toBe('ASSIGNED')
    expect(model.events.find((item) => item.isCurrent)?.id).toBe('h2')
    expect(model.events.find((item) => item.id === 'h1')?.kind).toBe('completed')
  })

  it('conserva repeticiones reales como reapertura y nueva atención', () => {
    const model = buildFlowModel({
      id: 't1',
      status: 'IN_PROGRESS',
      statusHistory: [
        event({ id: 'h1', newStatus: 'OPEN', createdAt: '2026-08-18T10:00:00.000Z' }),
        event({ id: 'h2', newStatus: 'RESOLVED', oldStatus: 'IN_PROGRESS', createdAt: '2026-08-18T11:00:00.000Z' }),
        event({ id: 'h3', newStatus: 'IN_PROGRESS', oldStatus: 'RESOLVED', createdAt: '2026-08-18T12:00:00.000Z' }),
      ],
    })
    expect(model.events.filter((item) => item.ticketStatus === 'IN_PROGRESS' && !item.isPending)).toHaveLength(1)
    expect(model.events.filter((item) => !item.isPending).map((item) => item.id)).toEqual(['h1', 'h2', 'h3'])
    expect(model.events.find((item) => item.id === 'h3')?.kind).toBe('current')
    expect(model.events.find((item) => item.id === 'h3')?.lane).toBe('exception')
  })

  it('distingue excepciones de la ruta principal', () => {
    const model = buildFlowModel({
      id: 't1',
      status: 'ESCALATED',
      statusHistory: [
        event({ id: 'h1', newStatus: 'OPEN', createdAt: '2026-08-18T10:00:00.000Z' }),
        event({
          id: 'h2',
          newStatus: 'ESCALATED',
          oldStatus: 'IN_PROGRESS',
          createdAt: '2026-08-18T11:00:00.000Z',
          eventType: 'STATUS_CHANGED',
        }),
      ],
    })
    expect(model.events.find((item) => item.id === 'h2')?.kind).toBe('current')
    expect(model.events.find((item) => item.id === 'h2')?.lane).toBe('exception')
  })

  it('no inventa fecha ni responsable en etapas pendientes', () => {
    const model = buildFlowModel({
      id: 't1',
      status: 'OPEN',
      statusHistory: [event({ id: 'h1', newStatus: 'OPEN', createdAt: '2026-08-18T10:00:00.000Z' })],
    })
    const pending = model.events.filter((item) => item.isPending)
    expect(pendingStatuses('OPEN')).toEqual(['ASSIGNED'])
    expect(pending[0]?.occurredAt).toBeNull()
    expect(pending[0]?.actorName).toBeNull()
    expect(pending[0]?.durationLabel).toBe(MISSING_VALUE)
    expect(pending[0]?.kind).toBe('pending')
  })

  it('un ticket sin eventos no inventa etapas completadas', () => {
    const model = buildFlowModel({ id: 't1', status: 'OPEN', statusHistory: [] })
    expect(model.events.filter((item) => item.kind === 'completed')).toHaveLength(0)
    expect(model.currentEventId).toBeNull()
  })

  it('una duración abierta se muestra como En curso y nunca es negativa', () => {
    expect(formatFlowDuration('2026-08-18T10:00:00.000Z', undefined, true)).toBe(DURATION_IN_PROGRESS)
    expect(formatFlowDuration('2026-08-18T12:00:00.000Z', '2026-08-18T10:00:00.000Z')).toBe('0 min')
  })

  it('campos ausentes o inválidos muestran No disponible', () => {
    expect(displayValue(null)).toBe(MISSING_VALUE)
    expect(displayValue('undefined')).toBe(MISSING_VALUE)
    expect(displayValue('NaN')).toBe(MISSING_VALUE)
    expect(formatFlowDate('no-es-fecha')).toBe(MISSING_VALUE)
    expect(formatFlowTime(undefined)).toBe(MISSING_VALUE)
  })

  it('una respuesta antigua no reemplaza el ticket seleccionado', () => {
    const gate = createSequenceGuard()
    const first = gate.next()
    const second = gate.next()
    expect(first.isLatest()).toBe(false)
    expect(second.isLatest()).toBe(true)
  })

  it('infiere el evento técnico cuando el contrato no lo trae', () => {
    expect(inferEventType(event({ id: 'h1', newStatus: 'OPEN', createdAt: '2026-08-18T10:00:00.000Z' }))).toBe(
      'CREATED',
    )
    expect(
      inferEventType(
        event({
          id: 'h2',
          newStatus: 'ASSIGNED',
          oldStatus: 'OPEN',
          createdAt: '2026-08-18T11:00:00.000Z',
        }),
      ),
    ).toBe('ASSIGNED')
  })

  it('los textos estáticos del flujo contienen acentos válidos', () => {
    const model = buildFlowModel({
      id: 't1',
      status: 'ASSIGNED',
      statusHistory: [
        event({
          id: 'h1',
          newStatus: 'ASSIGNED',
          oldStatus: 'OPEN',
          createdAt: '2026-08-18T11:00:00.000Z',
          eventType: 'ASSIGNED',
        }),
      ],
    })
    const source = model.events
      .map((item) => `${item.title}${getEventTypeLabel(item.technicalEvent)}${item.kindLabel}`)
      .join(' ')
    expect(source).toContain('Asignación')
    expect(getEventTypeLabel('ASSIGNED')).toBe('Asignación del ticket')
    expect(source).not.toMatch(/Ã|Â|â|�/)
  })
})

const KNOWN_EVENT_CODES = [
  'CREATED',
  'ASSIGNED',
  'REASSIGNED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'UPDATED',
  'UNKNOWN_EVENT_TYPE',
]

describe('Flujo visual — etiquetas de evento', () => {
  it('traduce STATUS_CHANGED como Cambio de estado y conserva el código interno', () => {
    const model = buildFlowModel({
      id: 't1',
      status: 'ESCALATED',
      statusHistory: [
        event({
          id: 'h1',
          newStatus: 'ESCALATED',
          oldStatus: 'IN_PROGRESS',
          createdAt: '2026-08-18T11:00:00.000Z',
          eventType: 'STATUS_CHANGED',
        }),
      ],
    })
    const current = model.events.find((item) => item.id === 'h1')
    expect(current?.technicalEvent).toBe('STATUS_CHANGED')
    expect(getEventTypeLabel(current?.technicalEvent)).toBe('Cambio de estado')
    expect(current?.sourceLabel).toBe('Historial')
  })

  it('traduce todos los tipos reales del backend', () => {
    expect(getEventTypeLabel('CREATED')).toBe('Creación del ticket')
    expect(getEventTypeLabel('ASSIGNED')).toBe('Asignación del ticket')
    expect(getEventTypeLabel('REASSIGNED')).toBe('Reasignación del ticket')
    expect(getEventTypeLabel('STATUS_CHANGED')).toBe('Cambio de estado')
    expect(getEventTypeLabel('PRIORITY_CHANGED')).toBe('Cambio de prioridad')
    expect(getEventTypeLabel('UPDATED')).toBe('Actualización del ticket')
  })

  it('un tipo desconocido muestra Evento del sistema y no el código interno', () => {
    expect(getEventTypeLabel('UNKNOWN_EVENT_TYPE')).toBe(UNKNOWN_EVENT_TYPE_LABEL)
    expect(getEventTypeLabel('UNKNOWN_EVENT_TYPE')).not.toBe('UNKNOWN_EVENT_TYPE')
    const model = buildFlowModel({
      id: 't1',
      status: 'OPEN',
      statusHistory: [
        event({
          id: 'h1',
          newStatus: 'OPEN',
          createdAt: '2026-08-18T10:00:00.000Z',
          eventType: 'UNKNOWN_EVENT_TYPE',
        }),
      ],
    })
    const visible = model.events
      .map((item) => `${item.title} ${item.sourceLabel} ${item.description} ${item.kindLabel}`)
      .join(' ')
    for (const code of KNOWN_EVENT_CODES) {
      expect(visible).not.toContain(code)
    }
    expect(getEventTypeLabel(model.events[0]?.technicalEvent)).toBe(UNKNOWN_EVENT_TYPE_LABEL)
    expect(model.events[0]?.technicalEvent).toBe('UNKNOWN_EVENT_TYPE')
  })
})

describe('Flujo visual — filtro de estado', () => {
  const tickets = [
    { id: '1', status: 'OPEN' as const, title: 'Ticket cerrado por error de nombre' },
    { id: '2', status: 'ASSIGNED' as const, title: 'Asignado' },
    { id: '3', status: 'IN_PROGRESS' as const, title: 'En proceso' },
    { id: '4', status: 'WAITING_USER' as const, title: 'En espera' },
    { id: '5', status: 'ESCALATED' as const, title: 'Escalado' },
    { id: '6', status: 'RESOLVED' as const, title: 'Resuelto' },
    { id: '7', status: 'CLOSED' as const, title: 'Cerrado' },
    { id: '8', status: 'CANCELLED' as const, title: 'Cancelado' },
  ]

  it('Todos muestra todos los tickets permitidos', () => {
    expect(filterTicketsByStatus(tickets, 'ALL')).toHaveLength(8)
    expect(tickets.every((ticket) => matchesTicketStatusFilter(ticket, 'ALL'))).toBe(true)
  })

  it('Activos excluye resueltos, cerrados y cancelados', () => {
    const active = filterTicketsByStatus(tickets, 'ACTIVE')
    expect(active.map((item) => item.status)).toEqual([
      'OPEN',
      'ASSIGNED',
      'IN_PROGRESS',
      'WAITING_USER',
      'ESCALATED',
    ])
    expect(active.some((item) => item.status === 'RESOLVED')).toBe(false)
    expect(isActiveTicketStatus('RESOLVED')).toBe(false)
    expect(isActiveTicketStatus('CLOSED')).toBe(false)
    expect(isActiveTicketStatus('CANCELLED')).toBe(false)
  })

  it('Resueltos y Cerrados usan el estado real, no el título', () => {
    expect(matchesTicketStatusFilter(tickets[0], 'CLOSED')).toBe(false)
    expect(filterTicketsByStatus(tickets, 'RESOLVED').map((item) => item.id)).toEqual(['6'])
    expect(filterTicketsByStatus(tickets, 'CLOSED').map((item) => item.id)).toEqual(['7'])
    expect(filterTicketsByStatus(tickets, 'CANCELLED').map((item) => item.id)).toEqual(['8'])
  })

  it('calcula cantidades correctas por filtro', () => {
    expect(countTicketsByStatusFilter(tickets)).toEqual({
      ALL: 8,
      ACTIVE: 5,
      RESOLVED: 1,
      CLOSED: 1,
      CANCELLED: 1,
    })
  })
})
