import { useEffect, useMemo, useState } from 'react'
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
import { ErrorState } from '@/components/common/ErrorState'
import * as reportService from '@/services/report.service'
import type {
  ReportDateRangeParams,
  SlaComplianceSummary,
  TicketsByAgentItem,
  TicketsByCategoryItem,
  TicketsByCompanyItem,
  TicketsByStatusItem,
} from '@/types/report.types'

type ReportTab = 'status' | 'agent' | 'category' | 'sla' | 'company'

const REPORT_TABS: Array<{ key: ReportTab; label: string }> = [
  { key: 'status', label: 'Por estado' },
  { key: 'agent', label: 'Por agente' },
  { key: 'category', label: 'Por categoria/prioridad' },
  { key: 'sla', label: 'Cumplimiento SLA' },
  { key: 'company', label: 'Por empresa' },
]

const CHART_COLORS = ['#0f766e', '#1d4ed8', '#16a34a', '#b91c1c', '#ca8a04', '#7c3aed']

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDateDaysAgo(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return formatDateForInput(date)
}

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? '')).join(','))
  return [headers.join(','), ...body].join('\n')
}

function downloadCsv(fileName: string, rows: Array<Record<string, string | number>>) {
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ReportsPlaceholderPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('status')

  const [ticketsByStatus, setTicketsByStatus] = useState<TicketsByStatusItem[]>([])
  const [ticketsByAgent, setTicketsByAgent] = useState<TicketsByAgentItem[]>([])
  const [ticketsByCategory, setTicketsByCategory] = useState<TicketsByCategoryItem[]>([])
  const [ticketsByCompany, setTicketsByCompany] = useState<TicketsByCompanyItem[]>([])
  const [slaCompliance, setSlaCompliance] = useState<SlaComplianceSummary | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [rangePreset, setRangePreset] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')
  const [startDate, setStartDate] = useState(getDateDaysAgo(30))
  const [endDate, setEndDate] = useState(formatDateForInput(new Date()))

  const statusColumns: Column<TicketsByStatusItem>[] = [
    { key: 'status', header: 'Estado' },
    { key: 'count', header: 'Tickets' },
    {
      key: 'percentage',
      header: 'Porcentaje',
      render: (row) => `${row.percentage.toFixed(1)}%`,
    },
  ]

  const agentColumns: Column<TicketsByAgentItem>[] = [
    { key: 'agentName', header: 'Agente' },
    { key: 'open', header: 'Abiertos' },
    { key: 'inProgress', header: 'En proceso' },
    { key: 'resolved', header: 'Resueltos' },
    { key: 'overdue', header: 'Vencidos' },
    { key: 'total', header: 'Total' },
  ]

  const categoryColumns: Column<TicketsByCategoryItem>[] = [
    { key: 'category', header: 'Categoria' },
    { key: 'priority', header: 'Prioridad' },
    { key: 'count', header: 'Tickets' },
  ]

  const companyColumns: Column<TicketsByCompanyItem>[] = [
    { key: 'company', header: 'Empresa' },
    { key: 'industry', header: 'Industria' },
    { key: 'region', header: 'Region' },
    { key: 'tickets', header: 'Tickets' },
  ]

  const loadSlaCompliance = async (params: ReportDateRangeParams) => {
    const response = await reportService.getSlaCompliance(params)
    setSlaCompliance(response)
  }

  const loadReports = async () => {
    setLoading(true)
    setError('')

    try {
      const [statusData, agentData, categoryData, companyData] = await Promise.all([
        reportService.getTicketsByStatus(),
        reportService.getTicketsByAgent(),
        reportService.getTicketsByCategory(),
        reportService.getTicketsByCompany(),
      ])

      setTicketsByStatus(statusData)
      setTicketsByAgent(agentData)
      setTicketsByCategory(categoryData)
      setTicketsByCompany(companyData)

      await loadSlaCompliance({ startDate, endDate })
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudieron cargar los reportes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [])

  const handlePresetChange = (preset: '7d' | '30d' | '90d' | 'custom') => {
    setRangePreset(preset)
    if (preset === 'custom') return

    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
    const newStart = getDateDaysAgo(days)
    const newEnd = formatDateForInput(new Date())
    setStartDate(newStart)
    setEndDate(newEnd)
    void loadSlaCompliance({ startDate: newStart, endDate: newEnd })
  }

  const handleApplyCustomRange = () => {
    if (!startDate || !endDate) return
    void loadSlaCompliance({ startDate, endDate })
  }

  const handleExport = () => {
    if (activeTab === 'status') {
      downloadCsv(
        'reporte-tickets-por-estado.csv',
        ticketsByStatus.map((item) => ({
          estado: item.status,
          tickets: item.count,
          porcentaje: item.percentage,
        })),
      )
      return
    }

    if (activeTab === 'agent') {
      downloadCsv(
        'reporte-tickets-por-agente.csv',
        ticketsByAgent.map((item) => ({
          agente: item.agentName,
          abiertos: item.open,
          en_proceso: item.inProgress,
          resueltos: item.resolved,
          vencidos: item.overdue,
          total: item.total,
        })),
      )
      return
    }

    if (activeTab === 'category') {
      downloadCsv(
        'reporte-tickets-por-categoria-prioridad.csv',
        ticketsByCategory.map((item) => ({
          categoria: item.category,
          prioridad: item.priority,
          tickets: item.count,
        })),
      )
      return
    }

    if (activeTab === 'sla') {
      if (!slaCompliance) return
      downloadCsv('reporte-cumplimiento-sla.csv', [
        {
          periodo: slaCompliance.periodLabel,
          dentro_sla: slaCompliance.withinSla,
          fuera_sla: slaCompliance.outOfSla,
          porcentaje_dentro: slaCompliance.withinPercentage,
          porcentaje_fuera: slaCompliance.outPercentage,
        },
      ])
      return
    }

    downloadCsv(
      'reporte-tickets-por-empresa.csv',
      ticketsByCompany.map((item) => ({
        empresa: item.company,
        industria: item.industry,
        region: item.region,
        tickets: item.tickets,
      })),
    )
  }

  const statusChartData = useMemo(
    () => ticketsByStatus.map((item) => ({ name: item.status, value: item.count })),
    [ticketsByStatus],
  )

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadReports()} />
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-brand-slate/40 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Reportes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Analitica operativa: estado, agentes, categorias, SLA y empresas.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
            >
              Vista impresion
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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

      {activeTab === 'status' && (
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
            <h2 className="text-base font-semibold text-brand-navy">Tickets por estado</h2>
            <div className="mt-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Tickets" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
            <h2 className="text-base font-semibold text-brand-navy">Distribucion porcentual</h2>
            <div className="mt-3 h-80">
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
            </div>
          </div>

          <div className="xl:col-span-2">
            <DataTable
              columns={statusColumns}
              data={ticketsByStatus}
              loading={loading}
              rowKey={(row) => row.status}
              emptyMessage="No hay datos por estado"
            />
          </div>
        </section>
      )}

      {activeTab === 'agent' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
            <h2 className="text-base font-semibold text-brand-navy">Tickets por agente</h2>
            <div className="mt-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByAgent}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="agentName" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" name="Abiertos" fill="#0f766e" />
                  <Bar dataKey="inProgress" name="En proceso" fill="#1d4ed8" />
                  <Bar dataKey="resolved" name="Resueltos" fill="#16a34a" />
                  <Bar dataKey="overdue" name="Vencidos" fill="#b91c1c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <DataTable
            columns={agentColumns}
            data={ticketsByAgent}
            loading={loading}
            rowKey={(row) => row.agentId}
            emptyMessage="No hay datos por agente"
          />
        </section>
      )}

      {activeTab === 'category' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
            <h2 className="text-base font-semibold text-brand-navy">Tickets por categoria y prioridad</h2>
            <div className="mt-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="category" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Tickets" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <DataTable
            columns={categoryColumns}
            data={ticketsByCategory}
            loading={loading}
            rowKey={(row) => `${row.category}-${row.priority}`}
            emptyMessage="No hay datos por categoria"
          />
        </section>
      )}

      {activeTab === 'sla' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-brand-navy">Cumplimiento de SLA</h2>
                <p className="text-sm text-slate-600">
                  Porcentaje de tickets dentro y fuera de tiempo.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <select
                  value={rangePreset}
                  onChange={(e) => handlePresetChange(e.target.value as '7d' | '30d' | '90d' | 'custom')}
                  className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
                >
                  <option value="7d">Ultimos 7 dias</option>
                  <option value="30d">Ultimos 30 dias</option>
                  <option value="90d">Ultimos 90 dias</option>
                  <option value="custom">Personalizado</option>
                </select>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
                  disabled={rangePreset !== 'custom'}
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
                  disabled={rangePreset !== 'custom'}
                />

                <button
                  type="button"
                  onClick={handleApplyCustomRange}
                  disabled={rangePreset !== 'custom'}
                  className="rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-brand-slate/30 p-4">
                <p className="text-sm text-slate-600">Periodo</p>
                <p className="mt-1 text-lg font-semibold text-brand-navy">
                  {slaCompliance?.periodLabel ?? '-'}
                </p>
                <p className="mt-3 text-sm text-slate-600">Dentro de SLA</p>
                <p className="text-2xl font-bold text-green-700">
                  {slaCompliance?.withinPercentage.toFixed(1) ?? '0'}%
                </p>
                <p className="mt-2 text-sm text-slate-600">Fuera de SLA</p>
                <p className="text-2xl font-bold text-brand-scarlet">
                  {slaCompliance?.outPercentage.toFixed(1) ?? '0'}%
                </p>
              </article>

              <article className="rounded-xl border border-brand-slate/30 p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip />
                      <Legend />
                      <Pie
                        data={[
                          { name: 'Dentro SLA', value: slaCompliance?.withinSla ?? 0 },
                          { name: 'Fuera SLA', value: slaCompliance?.outOfSla ?? 0 },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        <Cell fill="#16a34a" />
                        <Cell fill="#b91c1c" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'company' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-brand-slate/40 bg-white p-4">
            <h2 className="text-base font-semibold text-brand-navy">
              Tickets por empresa, industria y region
            </h2>
            <div className="mt-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByCompany}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="company" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tickets" name="Tickets" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <DataTable
            columns={companyColumns}
            data={ticketsByCompany}
            loading={loading}
            rowKey={(row) => row.company}
            emptyMessage="No hay datos por empresa"
          />
        </section>
      )}
    </div>
  )
}
