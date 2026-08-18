import { describe, expect, it } from 'vitest'
import type { Ticket } from '@/types/ticket.types'
import type { ReportExportData } from '@/utils/report-export'
import { buildReportCsv, buildReportInsights, buildReportPrintHtml } from '@/utils/report-export'

const sampleTicket: Ticket = {
  id: 't1',
  folio: 'HD-2026-0001',
  title: 'No puedo acceder al sistema de nomina',
  description: 'Credenciales invalidas',
  status: 'OPEN',
  categoryId: '2',
  categoryName: 'Software',
  priorityId: '3',
  priorityName: 'Alta',
  requesterId: '4',
  requesterName: 'Usuario Solicitante',
  assigneeId: null,
  assigneeName: null,
  slaDueAt: '2026-08-19T12:00:00.000Z',
  slaCreatedAt: '2026-08-18T10:00:00.000Z',
  resolutionHours: 24,
  createdAt: '2026-08-18T10:00:00.000Z',
}

const sample: ReportExportData = {
  meta: {
    startDate: '2026-07-18',
    endDate: '2026-08-18',
    generatedAt: new Date('2026-08-18T17:00:00.000Z'),
    generatedBy: 'Admin Sistema',
    generatedByRole: 'Administrador',
    limited: false,
  },
  tickets: [sampleTicket],
  byStatus: [
    { status: 'OPEN', count: 2, percentage: 40 },
    { status: 'RESOLVED', count: 3, percentage: 60 },
  ],
  byAgent: [
    {
      agentId: '2',
      agentName: 'Agente Soporte',
      open: 2,
      inProgress: 0,
      resolved: 3,
      overdue: 1,
      total: 5,
    },
  ],
  byCategory: [
    { category: 'Software', priority: 'Alta', count: 3 },
    { category: 'Hardware', priority: 'Media', count: 2 },
  ],
  byCompany: [{ company: 'Acme Corp', industry: 'Finanzas', region: 'Norte', tickets: 4 }],
  sla: {
    periodLabel: '2026-07-18 - 2026-08-18',
    withinSla: 2,
    outOfSla: 1,
    withinPercentage: 66.7,
    outPercentage: 33.3,
  },
  satisfaction: {
    averageRating: 4.5,
    totalResponses: 2,
    byRating: [
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 0 },
      { rating: 4, count: 1 },
      { rating: 5, count: 1 },
    ],
  },
}

describe('Exportación de reportes', () => {
  it('resume hallazgos importantes del periodo', () => {
    const insights = buildReportInsights(sample)
    expect(insights.totalTickets).toBe(5)
    expect(insights.topStatus).toBe('Resuelto')
    expect(insights.topAgent).toBe('Agente Soporte')
    expect(insights.topCategory).toBe('Software')
    expect(insights.slaLabel).toMatch(/medio/i)
    expect(insights.satisfactionLabel).toMatch(/alta/i)
  })

  it('arma un CSV con folio, título, estado, prioridad, categoría, agente y SLA', () => {
    const csv = buildReportCsv(sample)
    expect(csv.split('\n')[0]).toBe('Folio,Título,Estado,Prioridad,Categoría,Agente,SLA')
    expect(csv).toContain('HD-2026-0001')
    expect(csv).toContain('No puedo acceder al sistema de nomina')
    expect(csv).toContain('Abierto')
    expect(csv).toContain('Alta')
    expect(csv).toContain('Software')
    expect(csv).not.toContain('Resumen ejecutivo')
  })

  it('arma un documento de impresión con indicadores y tablas', () => {
    const html = buildReportPrintHtml(sample)
    expect(html).toContain('Reporte operativo')
    expect(html).toContain('Resumen ejecutivo')
    expect(html).toContain('Carga por agente')
    expect(html).toContain('Guardar como PDF')
    expect(html).toContain('HD-2026-0001')
    expect(html).toContain('Detalle de tickets')
    expect(html).not.toContain('<script')
  })
})
