import type {
  SatisfactionSummary,
  SlaComplianceSummary,
  TicketsByAgentItem,
  TicketsByCategoryItem,
  TicketsByCompanyItem,
  TicketsByStatusItem,
} from '@/types/report.types'
import type { Ticket } from '@/types/ticket.types'
import { toCsv } from '@/utils/csv'
import { ticketStatusLabel } from '@/utils/reports'
import { calculateSlaStatus, SLA_LABELS } from '@/utils/sla.utils'

export interface ReportExportMeta {
  startDate: string
  endDate: string
  generatedAt: Date
  generatedBy: string
  generatedByRole: string
  limited: boolean
}

export interface ReportExportData {
  meta: ReportExportMeta
  tickets: Ticket[]
  byStatus: TicketsByStatusItem[]
  byAgent: TicketsByAgentItem[]
  byCategory: TicketsByCategoryItem[]
  byCompany: TicketsByCompanyItem[]
  sla: SlaComplianceSummary | null
  satisfaction: SatisfactionSummary | null
}

export interface ReportInsights {
  totalTickets: number
  overdueTickets: number
  resolvedTickets: number
  topStatus: string
  topAgent: string
  topCategory: string
  topCompany: string
  slaLabel: string
  satisfactionLabel: string
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function pct(part: number, total: number) {
  if (!total) return '0.0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

function formatDay(isoDay: string) {
  const [year, month, day] = isoDay.split('-').map(Number)
  if (!year || !month || !day) return isoDay
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(year, month - 1, day))
}

export function formatGeneratedAt(date: Date) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function reportCsvFileName(startDate: string, endDate: string) {
  return `TicketFlow-tickets-${startDate}_${endDate}.csv`
}

export function mapTicketsForExport(tickets: Ticket[]) {
  return tickets.map((ticket) => {
    const sla = calculateSlaStatus(
      ticket.slaCreatedAt || ticket.createdAt,
      ticket.slaDueAt,
      ticket.resolutionHours,
    )
    return {
      Folio: ticket.folio,
      Título: ticket.title,
      Estado: ticketStatusLabel(ticket.status),
      Prioridad: ticket.priorityName,
      Categoría: ticket.categoryName,
      Agente: ticket.assigneeName || '—',
      SLA: SLA_LABELS[sla.level],
    }
  })
}

export function buildReportInsights(data: ReportExportData): ReportInsights {
  const totalTickets = sum(data.byStatus.map((item) => item.count))
  const overdueTickets = sum(data.byAgent.map((item) => item.overdue))
  const resolvedTickets = sum(data.byAgent.map((item) => item.resolved))
  const topStatusItem = [...data.byStatus].sort((a, b) => b.count - a.count)[0]
  const topStatus = topStatusItem ? ticketStatusLabel(topStatusItem.status) : 'Sin datos'
  const topAgent = [...data.byAgent].sort((a, b) => b.total - a.total)[0]?.agentName ?? 'Sin asignación'
  const categoryTotals = new Map<string, number>()
  for (const row of data.byCategory) {
    categoryTotals.set(row.category, (categoryTotals.get(row.category) ?? 0) + row.count)
  }
  const topCategory =
    [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin datos'
  const topCompany = [...data.byCompany].sort((a, b) => b.tickets - a.tickets)[0]?.company ?? 'Sin empresa'
  const sla = data.sla
  const slaLabel = !sla || sla.withinSla + sla.outOfSla === 0
    ? 'Sin cierres en el periodo'
    : sla.withinPercentage >= 80
      ? `Cumplimiento alto (${sla.withinPercentage.toFixed(1)}% a tiempo)`
      : sla.withinPercentage >= 60
        ? `Cumplimiento medio (${sla.withinPercentage.toFixed(1)}% a tiempo)`
        : `Cumplimiento bajo (${sla.withinPercentage.toFixed(1)}% a tiempo)`
  const average = data.satisfaction?.averageRating ?? 0
  const satisfactionLabel = !data.satisfaction?.totalResponses
    ? 'Sin encuestas en el periodo'
    : average >= 4
      ? `Satisfacción alta (${average.toFixed(1)} / 5)`
      : average >= 3
        ? `Satisfacción media (${average.toFixed(1)} / 5)`
        : `Satisfacción baja (${average.toFixed(1)} / 5)`
  return {
    totalTickets,
    overdueTickets,
    resolvedTickets,
    topStatus,
    topAgent,
    topCategory,
    topCompany,
    slaLabel,
    satisfactionLabel,
  }
}

export function buildReportCsv(data: ReportExportData) {
  return toCsv(mapTicketsForExport(data.tickets))
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function tableHtml(
  headers: string[],
  rows: Array<Array<string | number>>,
  emphasisLast = false,
  className = '',
) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
  const body = rows
    .map((row, index) => {
      const isTotal = emphasisLast && index === rows.length - 1
      const cells = row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')
      return `<tr class="${isTotal ? 'total' : ''}">${cells}</tr>`
    })
    .join('')
  return `<table class="${className}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

export function buildReportPrintHtml(data: ReportExportData) {
  const insights = buildReportInsights(data)
  const totalTickets = insights.totalTickets
  const slaTotal = (data.sla?.withinSla ?? 0) + (data.sla?.outOfSla ?? 0)
  const title = `TicketFlow · Reporte ${data.meta.startDate} a ${data.meta.endDate}`
  const statusRows = [
    ...data.byStatus.map((item) => [
      ticketStatusLabel(item.status),
      item.count,
      `${item.percentage.toFixed(1)}%`,
    ]),
    ['Total', totalTickets, totalTickets ? '100%' : '0%'],
  ]
  const agentRows = [
    ...data.byAgent.map((item) => [
      item.agentName,
      item.open,
      item.inProgress,
      item.resolved,
      item.overdue,
      item.total,
      pct(item.total, totalTickets),
      pct(item.resolved, item.total),
    ]),
    [
      'Total',
      sum(data.byAgent.map((item) => item.open)),
      sum(data.byAgent.map((item) => item.inProgress)),
      insights.resolvedTickets,
      insights.overdueTickets,
      sum(data.byAgent.map((item) => item.total)),
      '',
      '',
    ],
  ]
  const categoryRows = [
    ...data.byCategory.map((item) => [item.category, item.priority, item.count, pct(item.count, totalTickets)]),
    ['Total', '', sum(data.byCategory.map((item) => item.count)), ''],
  ]
  const companyRows = [
    ...data.byCompany.map((item) => [
      item.company,
      item.industry || '—',
      item.region || '—',
      item.tickets,
      pct(item.tickets, totalTickets),
    ]),
    ['Total', '', '', sum(data.byCompany.map((item) => item.tickets)), ''],
  ]
  const ticketRows = mapTicketsForExport(data.tickets).map((row) => [
    row.Folio,
    row.Título,
    row.Estado,
    row.Prioridad,
    row.Categoría,
    row.Agente,
    row.SLA,
  ])
  const satisfactionRows = [
    ...(data.satisfaction?.byRating ?? []).map((item) => [
      `${item.rating} ★`,
      item.count,
      pct(item.count, data.satisfaction?.totalResponses ?? 0),
    ]),
    [
      'Promedio',
      data.satisfaction?.averageRating.toFixed(1) ?? '0.0',
      `${data.satisfaction?.totalResponses ?? 0} respuestas`,
    ],
  ]

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #172033;
      background: #fff;
      font-family: "Segoe UI", system-ui, sans-serif;
      font-size: 12px;
    }
    .page { padding: 0 0 28px; }
    .hero {
      background: linear-gradient(135deg, #143b63 0%, #1e4e7a 58%, #2563d9 100%);
      color: #fff;
      padding: 28px 32px 24px;
    }
    .hero-kicker {
      margin: 0 0 8px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-size: 10px;
      opacity: 0.72;
      font-weight: 700;
    }
    h1 { margin: 0; font-size: 26px; letter-spacing: -0.03em; }
    .hero p { margin: 8px 0 0; max-width: 640px; opacity: 0.9; }
    .meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 20px;
    }
    .meta div {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 12px;
      padding: 10px 12px;
    }
    .meta span { display: block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; }
    .meta strong { display: block; margin-top: 4px; font-size: 13px; }
    .content { padding: 22px 32px 0; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
    .kpi {
      border: 1px solid #d9e2ec;
      border-radius: 14px;
      padding: 14px 16px;
      background: #f8fafc;
    }
    .kpi span { color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .kpi strong { display: block; margin-top: 6px; font-size: 22px; color: #143b63; }
    .kpi em { display: block; margin-top: 4px; font-style: normal; color: #64748b; }
    h2 {
      margin: 26px 0 10px;
      color: #143b63;
      font-size: 16px;
      border-bottom: 2px solid #2563d9;
      padding-bottom: 6px;
    }
    .insights { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 0 0 8px; }
    .insights p { margin: 0; }
    .insights b { color: #143b63; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #143b63; color: #fff; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    table.tickets { font-size: 10px; }
    table.tickets th, table.tickets td { padding: 6px 8px; }
    table.tickets td:nth-child(2) { max-width: 220px; }
    .sla-bar { height: 12px; border-radius: 999px; background: #fee2e2; overflow: hidden; margin-top: 8px; }
    .sla-bar span { display: block; height: 100%; background: #198754; }
    .note { color: #64748b; margin: 8px 0 0; }
    footer {
      margin: 28px 32px 0;
      padding-top: 12px;
      border-top: 1px solid #d9e2ec;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    @page { size: A4; margin: 12mm; }
    @media print {
      .hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th, .kpi, tr.total { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h2, .kpi { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="hero">
      <p class="hero-kicker">TicketFlow · Mesa de ayuda</p>
      <h1>Reporte operativo</h1>
      <p>Concentrado de tickets, carga de agentes, SLA y satisfacción del periodo seleccionado.</p>
      <div class="meta">
        <div><span>Periodo</span><strong>${escapeHtml(formatDay(data.meta.startDate))} — ${escapeHtml(formatDay(data.meta.endDate))}</strong></div>
        <div><span>Generado</span><strong>${escapeHtml(formatGeneratedAt(data.meta.generatedAt))}</strong></div>
        <div><span>Responsable</span><strong>${escapeHtml(data.meta.generatedBy)}</strong></div>
        <div><span>Alcance</span><strong>${data.meta.limited ? 'Tickets asignados' : 'Vista global'}</strong></div>
      </div>
    </header>
    <main class="content">
      <section class="kpis">
        <article class="kpi"><span>Tickets</span><strong>${insights.totalTickets}</strong><em>en el periodo</em></article>
        <article class="kpi"><span>Vencidos</span><strong>${insights.overdueTickets}</strong><em>aún abiertos fuera de tiempo</em></article>
        <article class="kpi"><span>SLA a tiempo</span><strong>${data.sla ? `${data.sla.withinPercentage.toFixed(1)}%` : '—'}</strong><em>${slaTotal} cierres evaluados</em></article>
        <article class="kpi"><span>Satisfacción</span><strong>${data.satisfaction ? data.satisfaction.averageRating.toFixed(1) : '—'}</strong><em>${data.satisfaction?.totalResponses ?? 0} encuestas</em></article>
      </section>
      <h2>Resumen ejecutivo</h2>
      <div class="insights">
        <p><b>Estado más frecuente:</b> ${escapeHtml(insights.topStatus)}</p>
        <p><b>Mayor carga:</b> ${escapeHtml(insights.topAgent)}</p>
        <p><b>Categoría más demandada:</b> ${escapeHtml(insights.topCategory)}</p>
        <p><b>Empresa con más tickets:</b> ${escapeHtml(insights.topCompany)}</p>
        <p><b>SLA:</b> ${escapeHtml(insights.slaLabel)}</p>
        <p><b>Satisfacción:</b> ${escapeHtml(insights.satisfactionLabel)}</p>
      </div>
      <h2>Detalle de tickets</h2>
      ${
        ticketRows.length
          ? tableHtml(
              ['Folio', 'Título', 'Estado', 'Prioridad', 'Categoría', 'Agente', 'SLA'],
              ticketRows,
              false,
              'tickets',
            )
          : '<p class="note">No hay tickets en el periodo seleccionado.</p>'
      }
      <h2>Tickets por estado</h2>
      ${tableHtml(['Estado', 'Tickets', 'Porcentaje'], statusRows, true)}
      <h2>Carga por agente</h2>
      ${tableHtml(['Agente', 'Abiertos', 'En proceso', 'Resueltos', 'Vencidos', 'Total', '% carga', '% resolución'], agentRows, true)}
      <h2>Categoría y prioridad</h2>
      ${tableHtml(['Categoría', 'Prioridad', 'Tickets', '% del total'], categoryRows, true)}
      <h2>Cumplimiento de SLA</h2>
      <p class="note">${escapeHtml(insights.slaLabel)}. Se incluyen tickets resueltos o cerrados en el periodo, con el último día inclusive.</p>
      <div class="sla-bar"><span style="width:${data.sla?.withinPercentage ?? 0}%"></span></div>
      ${tableHtml(
        ['Indicador', 'Cantidad', 'Porcentaje'],
        data.sla
          ? [
              ['Dentro de SLA', data.sla.withinSla, `${data.sla.withinPercentage.toFixed(1)}%`],
              ['Fuera de SLA', data.sla.outOfSla, `${data.sla.outPercentage.toFixed(1)}%`],
              ['Total evaluado', slaTotal, slaTotal ? '100%' : '0%'],
            ]
          : [['Sin datos', '—', '—']],
        true,
      )}
      <h2>Tickets por empresa</h2>
      ${tableHtml(['Empresa', 'Industria', 'Región', 'Tickets', '% del total'], companyRows, true)}
      <h2>Satisfacción del solicitante</h2>
      ${tableHtml(['Calificación', 'Respuestas', 'Participación'], satisfactionRows, true)}
    </main>
    <footer>
      <span>TicketFlow · Documento interno · ${escapeHtml(data.meta.generatedByRole)}</span>
      <span>En el diálogo de impresión elige “Guardar como PDF”.</span>
    </footer>
  </div>
</body>
</html>`
}

export function openReportPrint(html: string) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '830px'
  iframe.style.height = '1100px'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  const cleanup = () => iframe.remove()
  iframe.contentWindow?.addEventListener('afterprint', cleanup)
  window.setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }, 250)
  window.setTimeout(cleanup, 60_000)
}
