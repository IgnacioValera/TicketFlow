import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardDistributionPoint, DashboardTrendPoint } from '@/types/dashboard.types'

interface TicketsChartProps {
  trend: DashboardTrendPoint[]
  distribution: DashboardDistributionPoint[]
}

const PIE_COLORS = ['#7d5ce1', '#d96b52', '#45a77e', '#e2ae48', '#776c7d']

export function TicketsChart({ trend, distribution }: TicketsChartProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-brand-slate/40 bg-white p-5 shadow-[0_10px_30px_rgba(61,45,69,.04)]">
        <h2 className="text-base font-semibold text-brand-navy">Tendencia semanal</h2>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="period" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="open"
                name="Abiertos"
                stroke="#7d5ce1"
                strokeWidth={2.5}
              />
              <Line
                type="monotone"
                dataKey="inProgress"
                name="En proceso"
                stroke="#d96b52"
                strokeWidth={2.5}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="Resueltos"
                stroke="#45a77e"
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-brand-slate/40 bg-white p-5 shadow-[0_10px_30px_rgba(61,45,69,.04)]">
        <h2 className="text-base font-semibold text-brand-navy">Distribución por estado</h2>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={distribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                fill="#7d5ce1"
                label
              >
                {distribution.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
