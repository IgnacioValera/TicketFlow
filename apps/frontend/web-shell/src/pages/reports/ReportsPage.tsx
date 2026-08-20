import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataTable, type Column } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { AppIcon } from '@/components/common/AppIcon'
import { PERMISSIONS } from '@/constants/permissions'
import { ROLES } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import * as reportService from '@/services/report.service'
import type {
  ReportDateRangeParams,
  SatisfactionSummary,
  SlaComplianceSummary,
  TicketsByAgentItem,
  TicketsByCategoryItem,
  TicketsByCompanyItem,
  TicketsByStatusItem,
} from '@/types/report.types'
import type { Ticket } from '@/types/ticket.types'
import { downloadCsvText } from '@/utils/csv'
import { getErrorMessages } from '@/utils/errors'
import {
  buildReportCsv,
  buildReportPrintHtml,
  openReportPrint,
  reportCsvFileName,
  type ReportExportData,
} from '@/utils/report-export'
import { canRequestDateRange, hasPositiveValues, ticketStatusLabel } from '@/utils/reports'

type ReportTab = 'status' | 'agent' | 'category' | 'sla' | 'company' | 'satisfaction'
type RangePreset = '7d' | '30d' | '90d' | 'custom'

const REPORT_TABS: Array<{ key: ReportTab; label: string }> = [
  { key: 'status', label: 'Por estado' },
  { key: 'agent', label: 'Por agente' },
  { key: 'category', label: 'Por categoría/prioridad' },
  { key: 'sla', label: 'Cumplimiento SLA' },
  { key: 'company', label: 'Por empresa' },
  { key: 'satisfaction', label: 'Satisfacción' },
]

const CHART_COLORS = ['#0f766e', '#1d4ed8', '#16a34a', '#b91c1c', '#ca8a04', '#475569']
const EMPTY_CHART = 'No hay datos para el rango seleccionado.'
const EMPTY_CHART_HINT = 'Prueba con otro periodo o verifica que existan tickets en esas fechas.'

function formatDateForInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateDaysAgo(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return formatDateForInput(date)
}

function ChartFrame({
  loading,
  empty,
  children,
}: {
  loading: boolean
  empty: boolean
  children: ReactNode
}) {
  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg bg-slate-50 sm:h-80">
        <p className="sr-only">Cargando...</p>
        <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }
  if (empty) {
    return <EmptyState title={EMPTY_CHART} description={EMPTY_CHART_HINT} />
  }
  return <div className="h-72 sm:h-80">{children}</div>
}

export function ReportsPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const isLimited =
    hasPermission(PERMISSIONS.REPORT_VIEW_LIMITED) && !hasPermission(PERMISSIONS.REPORT_VIEW)

  const [activeTab, setActiveTab] = useState<ReportTab>('status')
  const [ticketsByStatus, setTicketsByStatus] = useState<TicketsByStatusItem[]>([])
  const [ticketsByAgent, setTicketsByAgent] = useState<TicketsByAgentItem[]>([])
  const [ticketsByCategory, setTicketsByCategory] = useState<TicketsByCategoryItem[]>([])
  const [ticketsByCompany, setTicketsByCompany] = useState<TicketsByCompanyItem[]>([])
  const [slaCompliance, setSlaCompliance] = useState<SlaComplianceSummary | null>(null)
  const [satisfaction, setSatisfaction] = useState<SatisfactionSummary | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rangeError, setRangeError] = useState('')
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d')
  const [startDate, setStartDate] = useState(getDateDaysAgo(30))
  const [endDate, setEndDate] = useState(formatDateForInput(new Date()))

  const statusColumns: Column<TicketsByStatusItem>[] = useMemo(
    () => [
      { key: 'status', header: 'Estado', render: (row) => ticketStatusLabel(row.status) },
      { key: 'count', header: 'Tickets' },
      { key: 'percentage', header: 'Porcentaje', render: (row) => `${row.percentage.toFixed(1)}%` },
    ],
    [],
  )

  const agentColumns: Column<TicketsByAgentItem>[] = useMemo(
    () => [
      { key: 'agentName', header: 'Agente' },
      { key: 'open', header: 'Abiertos' },
      { key: 'inProgress', header: 'En proceso' },
      { key: 'resolved', header: 'Resueltos' },
      { key: 'overdue', header: 'Vencidos' },
      { key: 'total', header: 'Total' },
    ],
    [],
  )

  const categoryColumns: Column<TicketsByCategoryItem>[] = useMemo(
    () => [
      { key: 'category', header: 'Categoría' },
      { key: 'priority', header: 'Prioridad' },
      { key: 'count', header: 'Tickets' },
    ],
    [],
  )

  const companyColumns: Column<TicketsByCompanyItem>[] = useMemo(
    () => [
      { key: 'company', header: 'Empresa' },
      { key: 'industry', header: 'Industria' },
      { key: 'region', header: 'Región' },
      { key: 'tickets', header: 'Tickets' },
    ],
    [],
  )

  const satisfactionColumns: Column<{ rating: number; count: number }>[] = useMemo(
    () => [
      { key: 'rating', header: 'Calificación', render: (row) => `${row.rating} ${row.rating === 1 ? 'estrella' : 'estrellas'}` },
      { key: 'count', header: 'Respuestas' },
    ],
    [],
  )

  const loadReports = useCallback(async (params: ReportDateRangeParams) => {
    setLoading(true)
    setError('')
    try {
      const [statusData, agentData, categoryData, companyData, slaData, satisfactionData, ticketData] =
        await Promise.all([
          reportService.getTicketsByStatus(params),
          reportService.getTicketsByAgent(params),
          reportService.getTicketsByCategory(params),
          reportService.getTicketsByCompany(params),
          reportService.getSlaCompliance(params),
          reportService.getSatisfaction(params),
          reportService.getTicketsForReport(params),
        ])
      setTicketsByStatus(statusData)
      setTicketsByAgent(agentData)
      setTicketsByCategory(categoryData)
      setTicketsByCompany(companyData)
      setSlaCompliance(slaData)
      setSatisfaction(satisfactionData)
      setTickets(ticketData)
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudieron cargar los reportes').join(' '))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const invalid = canRequestDateRange(startDate, endDate)
    if (invalid) {
      setRangeError(invalid)
      return
    }
    setRangeError('')
    void loadReports({ startDate, endDate })
  }, [startDate, endDate, loadReports])

  const handlePresetChange = (preset: RangePreset) => {
    setRangePreset(preset)
    if (preset === 'custom') return
    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
    setStartDate(getDateDaysAgo(days))
    setEndDate(formatDateForInput(new Date()))
  }

  const exportData = useMemo<ReportExportData>(
    () => ({
      meta: {
        startDate,
        endDate,
        generatedAt: new Date(),
        generatedBy: user?.fullName ?? 'Usuario',
        generatedByRole: user ? ROLES[user.role] : 'Sin rol',
        limited: isLimited,
      },
      tickets,
      byStatus: ticketsByStatus,
      byAgent: ticketsByAgent,
      byCategory: ticketsByCategory,
      byCompany: ticketsByCompany,
      sla: slaCompliance,
      satisfaction,
    }),
    [
      startDate,
      endDate,
      user,
      isLimited,
      tickets,
      ticketsByStatus,
      ticketsByAgent,
      ticketsByCategory,
      ticketsByCompany,
      slaCompliance,
      satisfaction,
    ],
  )

  const handleExport = () => {
    downloadCsvText(reportCsvFileName(startDate, endDate), buildReportCsv(exportData))
  }

  const handlePrintPdf = () => {
    openReportPrint(buildReportPrintHtml(exportData))
  }

  const statusChartData = useMemo(
    () =>
      ticketsByStatus.map((item) => ({
        name: ticketStatusLabel(item.status),
        value: item.count,
      })),
    [ticketsByStatus],
  )
  const slaChartData = [
    { name: 'Dentro SLA', value: slaCompliance?.withinSla ?? 0 },
    { name: 'Fuera SLA', value: slaCompliance?.outOfSla ?? 0 },
  ]
  const satisfactionChartData = (satisfaction?.byRating ?? []).map((item) => ({
    name: `${item.rating}★`,
    count: item.count,
  }))

  const axisProps = {
    interval: 0 as const,
    angle: -18,
    textAnchor: 'end' as const,
    height: 64,
    tick: { fontSize: 11 },
  }

  return (
    <div className="space-y-6">
      {isLimited && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Vista limitada: solo se incluyen los tickets asignados a ti.
        </p>
      )}
      <header className="rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-40 text-sm text-slate-600">
            Periodo
            <select
              value={rangePreset}
              onChange={(event) => handlePresetChange(event.target.value as RangePreset)}
              className="mt-1 w-full rounded-lg border border-brand-slate px-3 py-2 text-sm text-brand-navy"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <label className="block min-w-40 text-sm text-slate-600">
            Fecha inicial
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setRangePreset('custom')
                setStartDate(event.target.value)
              }}
              className="mt-1 w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            />
          </label>
          <label className="block min-w-40 text-sm text-slate-600">
            Fecha final
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setRangePreset('custom')
                setEndDate(event.target.value)
              }}
              className="mt-1 w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            />
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || Boolean(error)}
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <AppIcon name="download" className="h-4 w-4" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={loading || Boolean(error)}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50 disabled:opacity-50"
            >
              <AppIcon name="file" className="h-4 w-4" />
              Exportar PDF
            </button>
          </div>
        </div>
        {rangeError && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {rangeError} No se envió la consulta al servidor.
          </p>
        )}

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-brand-teal text-white'
                  : 'border border-brand-slate text-brand-navy hover:bg-brand-cream/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={() => void loadReports({ startDate, endDate })} />
      ) : (
        <>
          {activeTab === 'status' && (
            <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
                <h2 className="text-base font-semibold text-brand-navy">Tickets por estado</h2>
                <div className="mt-3">
                  <ChartFrame loading={loading} empty={!hasPositiveValues(ticketsByStatus.map((item) => item.count))}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="name" {...axisProps} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" name="Tickets" fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </div>
              </div>
              <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
                <h2 className="text-base font-semibold text-brand-navy">Distribución porcentual</h2>
                <div className="mt-3">
                  <ChartFrame loading={loading} empty={!hasPositiveValues(statusChartData.map((item) => item.value))}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={100} label>
                          {statusChartData.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </div>
              </div>
              <div className="xl:col-span-2">
                <DataTable
                  columns={statusColumns}
                  data={ticketsByStatus}
                  loading={loading}
                  rowKey={(row) => row.status}
                  emptyMessage="No hay datos por estado"
                  emptyDescription={EMPTY_CHART_HINT}
                />
              </div>
            </section>
          )}

          {activeTab === 'agent' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
                <h2 className="text-base font-semibold text-brand-navy">Tickets por agente</h2>
                <div className="mt-3">
                  <ChartFrame loading={loading} empty={!hasPositiveValues(ticketsByAgent.map((item) => item.total))}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ticketsByAgent}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="agentName" {...axisProps} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="open" name="Abiertos" fill="#0f766e" />
                        <Bar dataKey="inProgress" name="En proceso" fill="#1d4ed8" />
                        <Bar dataKey="resolved" name="Resueltos" fill="#16a34a" />
                        <Bar dataKey="overdue" name="Vencidos" fill="#b91c1c" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </div>
              </div>
              <DataTable
                columns={agentColumns}
                data={ticketsByAgent}
                loading={loading}
                rowKey={(row) => row.agentId}
                emptyMessage="No hay datos por agente"
                emptyDescription={EMPTY_CHART_HINT}
              />
            </section>
          )}

          {activeTab === 'category' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
                <h2 className="text-base font-semibold text-brand-navy">
                  Tickets por categoría y prioridad
                </h2>
                <div className="mt-3">
                  <ChartFrame
                    loading={loading}
                    empty={!hasPositiveValues(ticketsByCategory.map((item) => item.count))}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ticketsByCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="category" {...axisProps} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Tickets" fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </div>
              </div>
              <DataTable
                columns={categoryColumns}
                data={ticketsByCategory}
                loading={loading}
                rowKey={(row) => `${row.category}-${row.priority}`}
                emptyMessage="No hay datos por categoría"
                emptyDescription={EMPTY_CHART_HINT}
              />
            </section>
          )}

          {activeTab === 'sla' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
                <h2 className="text-base font-semibold text-brand-navy">Cumplimiento de SLA</h2>
                <p className="text-sm text-slate-600">
                  Tickets resueltos o cerrados en el periodo, incluyendo el último día.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <article className="rounded-xl border border-brand-slate/30 p-4">
                    <p className="text-sm text-slate-600">Periodo</p>
                    <p className="mt-1 text-lg font-semibold text-brand-navy">
                      {loading ? '…' : (slaCompliance?.periodLabel ?? '—')}
                    </p>
                    <p className="mt-3 text-sm text-slate-600">Dentro de SLA</p>
                    <p className="text-2xl font-bold text-green-700">
                      {loading ? '…' : `${slaCompliance?.withinPercentage.toFixed(1) ?? '0.0'}%`}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">Fuera de SLA</p>
                    <p className="text-2xl font-bold text-brand-scarlet">
                      {loading ? '…' : `${slaCompliance?.outPercentage.toFixed(1) ?? '0.0'}%`}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      {slaCompliance
                        ? `${slaCompliance.withinSla} a tiempo · ${slaCompliance.outOfSla} fuera de tiempo`
                        : 'Sin cierres en el periodo'}
                    </p>
                  </article>
                  <article className="rounded-xl border border-brand-slate/30 p-4">
                    <ChartFrame
                      loading={loading}
                      empty={!hasPositiveValues(slaChartData.map((item) => item.value))}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip />
                          <Legend />
                          <Pie data={slaChartData} dataKey="value" nameKey="name" outerRadius={90} label>
                            <Cell fill="#16a34a" />
                            <Cell fill="#b91c1c" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartFrame>
                  </article>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'company' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
                <h2 className="text-base font-semibold text-brand-navy">
                  Tickets por empresa, industria y región
                </h2>
                <div className="mt-3">
                  <ChartFrame
                    loading={loading}
                    empty={!hasPositiveValues(ticketsByCompany.map((item) => item.tickets))}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ticketsByCompany}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="company" {...axisProps} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="tickets" name="Tickets" fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </div>
              </div>
              <DataTable
                columns={companyColumns}
                data={ticketsByCompany}
                loading={loading}
                rowKey={(row) => row.company}
                emptyMessage="No hay datos por empresa"
                emptyDescription={EMPTY_CHART_HINT}
              />
            </section>
          )}

          {activeTab === 'satisfaction' && (
            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-xl border border-brand-slate/40 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Promedio
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-brand-navy">
                    {loading ? '…' : (satisfaction?.averageRating.toFixed(1) ?? '0.0')}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Calificación de 1 a 5</p>
                </article>
                <article className="rounded-xl border border-brand-slate/40 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Respuestas
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-brand-navy">
                    {loading ? '…' : (satisfaction?.totalResponses ?? 0)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Encuestas en el periodo</p>
                </article>
              </div>
              <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
                <h2 className="text-base font-semibold text-brand-navy">Distribución de calificaciones</h2>
                <div className="mt-3">
                  <ChartFrame
                    loading={loading}
                    empty={!hasPositiveValues(satisfactionChartData.map((item) => item.count))}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={satisfactionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Respuestas" fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </div>
              </div>
              <DataTable
                columns={satisfactionColumns}
                data={satisfaction?.byRating ?? []}
                loading={loading}
                rowKey={(row) => String(row.rating)}
                emptyMessage="No hay encuestas de satisfacción"
                emptyDescription={EMPTY_CHART_HINT}
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}
