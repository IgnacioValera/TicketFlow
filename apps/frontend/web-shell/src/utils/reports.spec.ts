import { describe, expect, it } from 'vitest'
import type { Ticket } from '@/types/ticket.types'
import {
  aggregateSatisfaction,
  aggregateSlaCompliance,
  aggregateTicketsByStatus,
  canRequestDateRange,
  filterTicketsByCreatedRange,
  hasPositiveValues,
  isIsoInInclusiveRange,
  ticketStatusLabel,
} from '@/utils/reports'

function ticket(partial: Partial<Ticket> & Pick<Ticket, 'id' | 'status' | 'createdAt'>): Ticket {
  return {
    folio: partial.id,
    title: 'Ticket',
    description: 'Desc',
    categoryId: '1',
    categoryName: 'Software',
    priorityId: '1',
    priorityName: 'Media',
    requesterId: '4',
    requesterName: 'Usuario',
    slaDueAt: '2026-08-10T12:00:00.000Z',
    slaCreatedAt: partial.createdAt,
    resolutionHours: 24,
    closedAt: null,
    ...partial,
  }
}

describe('Reportes', () => {
  it('traduce estados de ticket', () => {
    expect(ticketStatusLabel('IN_PROGRESS')).toBe('En proceso')
    expect(ticketStatusLabel('OPEN')).toBe('Abierto')
  })

  it('no permite consultar un rango invertido', () => {
    expect(canRequestDateRange('2026-08-10', '2026-08-01')).toMatch(/fecha inicial/i)
  })

  it('incluye el último día del rango', () => {
    expect(isIsoInInclusiveRange('2026-08-10T23:30:00.000Z', '2026-08-01', '2026-08-10')).toBe(true)
    expect(isIsoInInclusiveRange('2026-08-11T00:00:00.000Z', '2026-08-01', '2026-08-10')).toBe(false)
  })

  it('filtra tickets por created_at de forma inclusiva', () => {
    const tickets = [
      ticket({ id: 'a', status: 'OPEN', createdAt: '2026-08-10T22:00:00.000Z' }),
      ticket({ id: 'b', status: 'OPEN', createdAt: '2026-08-11T01:00:00.000Z' }),
    ]
    const filtered = filterTicketsByCreatedRange(tickets, {
      startDate: '2026-08-01',
      endDate: '2026-08-10',
    })
    expect(filtered.map((item) => item.id)).toEqual(['a'])
  })

  it('agrega tickets por estado con porcentajes', () => {
    const rows = aggregateTicketsByStatus([
      ticket({ id: '1', status: 'OPEN', createdAt: '2026-08-01T00:00:00.000Z' }),
      ticket({ id: '2', status: 'OPEN', createdAt: '2026-08-01T00:00:00.000Z' }),
      ticket({ id: '3', status: 'RESOLVED', createdAt: '2026-08-01T00:00:00.000Z' }),
    ])
    expect(rows.find((row) => row.status === 'OPEN')).toMatchObject({ count: 2, percentage: 66.7 })
    expect(rows.find((row) => row.status === 'RESOLVED')).toMatchObject({ count: 1, percentage: 33.3 })
  })

  it('calcula SLA solo con tickets cerrados en el periodo', () => {
    const sla = aggregateSlaCompliance(
      [
        ticket({
          id: 'in',
          status: 'CLOSED',
          createdAt: '2026-08-01T00:00:00.000Z',
          closedAt: '2026-08-10T10:00:00.000Z',
          slaDueAt: '2026-08-11T00:00:00.000Z',
        }),
        ticket({
          id: 'out',
          status: 'RESOLVED',
          createdAt: '2026-08-01T00:00:00.000Z',
          closedAt: '2026-08-10T18:00:00.000Z',
          slaDueAt: '2026-08-10T12:00:00.000Z',
        }),
        ticket({
          id: 'outside',
          status: 'CLOSED',
          createdAt: '2026-07-01T00:00:00.000Z',
          closedAt: '2026-07-02T00:00:00.000Z',
          slaDueAt: '2026-07-03T00:00:00.000Z',
        }),
      ],
      { startDate: '2026-08-01', endDate: '2026-08-10' },
    )
    expect(sla.withinSla).toBe(1)
    expect(sla.outOfSla).toBe(1)
    expect(sla.withinPercentage).toBe(50)
  })

  it('calcula satisfacción por submitted_at inclusivo', () => {
    const summary = aggregateSatisfaction(
      [
        ticket({
          id: 's1',
          status: 'CLOSED',
          createdAt: '2026-08-01T00:00:00.000Z',
          survey: { id: '1', ticketId: 's1', rating: 5, submittedAt: '2026-08-10T20:00:00.000Z' },
        }),
        ticket({
          id: 's2',
          status: 'CLOSED',
          createdAt: '2026-08-01T00:00:00.000Z',
          survey: { id: '2', ticketId: 's2', rating: 3, submittedAt: '2026-08-11T00:00:00.000Z' },
        }),
      ],
      { startDate: '2026-08-01', endDate: '2026-08-10' },
    )
    expect(summary.totalResponses).toBe(1)
    expect(summary.averageRating).toBe(5)
  })

  it('detecta gráficas sin valores reales', () => {
    expect(hasPositiveValues([0, 0, 0])).toBe(false)
    expect(hasPositiveValues([0, 2])).toBe(true)
  })
})
