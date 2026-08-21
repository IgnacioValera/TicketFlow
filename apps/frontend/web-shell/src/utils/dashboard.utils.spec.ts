import { describe, expect, it } from 'vitest'
import { buildDashboardSummary, kpiFilterHref, statusesForPreset } from '@/utils/dashboard.utils'
import type { Ticket } from '@/types/ticket.types'

function ticket(partial: Partial<Ticket> & Pick<Ticket, 'id' | 'status'>): Ticket {
  return {
    folio: partial.folio ?? `HD-2026-${partial.id}`,
    title: partial.title ?? 'Ticket de prueba',
    description: 'Descripción',
    categoryId: '1',
    categoryName: 'Hardware',
    priorityId: partial.priorityId ?? '2',
    priorityName: partial.priorityName ?? 'Media',
    priorityColor: '#247b7b',
    requesterId: '4',
    requesterName: 'Solicitante',
    assigneeId: partial.assigneeId ?? null,
    assigneeName: partial.assigneeName ?? null,
    slaDueAt: partial.slaDueAt ?? new Date(Date.now() + 3600000).toISOString(),
    slaCreatedAt: partial.slaCreatedAt ?? new Date().toISOString(),
    resolutionHours: partial.resolutionHours ?? 48,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    ...partial,
  }
}

describe('dashboard.utils', () => {
  it('calcula KPIs coherentes con el listado', () => {
    const tickets = [
      ticket({ id: '1', status: 'OPEN' }),
      ticket({ id: '2', status: 'ASSIGNED' }),
      ticket({ id: '3', status: 'IN_PROGRESS' }),
      ticket({ id: '4', status: 'RESOLVED' }),
      ticket({ id: '5', status: 'CLOSED' }),
      ticket({
        id: '6',
        status: 'OPEN',
        slaDueAt: new Date(Date.now() - 3600000).toISOString(),
      }),
    ]

    const summary = buildDashboardSummary(tickets, 'GLOBAL')
    expect(summary.kpis.find((kpi) => kpi.key === 'open')?.value).toBe(3)
    expect(summary.kpis.find((kpi) => kpi.key === 'inProgress')?.value).toBe(1)
    expect(summary.kpis.find((kpi) => kpi.key === 'resolved')?.value).toBe(1)
    expect(summary.kpis.find((kpi) => kpi.key === 'closed')?.value).toBe(1)
    expect(summary.kpis.find((kpi) => kpi.key === 'overdue')?.value).toBe(1)
  })

  it('expone enlaces de filtro por KPI', () => {
    expect(kpiFilterHref('open')).toBe('/tickets?preset=open')
    expect(kpiFilterHref('overdue')).toBe('/tickets?slaStatus=overdue')
    expect(kpiFilterHref('inProgress')).toBe('/tickets?preset=inProgress')
    expect(kpiFilterHref('resolved')).toBe('/tickets?preset=resolved')
    expect(kpiFilterHref('closed')).toBe('/tickets?preset=closed')
    expect(statusesForPreset('open')).toEqual(['OPEN', 'ASSIGNED'])
    expect(statusesForPreset('inProgress')).toEqual(['IN_PROGRESS', 'WAITING_USER', 'ESCALATED'])
    expect(statusesForPreset('resolved')).toEqual(['RESOLVED'])
    expect(statusesForPreset('closed')).toEqual(['CLOSED'])
  })
})
