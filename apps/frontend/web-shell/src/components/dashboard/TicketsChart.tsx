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

const PIE_COLORS = ['#0f766e', '#b91c1c', '#1d4ed8', '#ca8a04', '#7c3aed']

export function TicketsChart({ trend, distribution }: TicketsChartProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-brand-slate/40 bg-white p-4">
        <h2 className="text-base font-semibold text-brand-navy">Tendencia semanal</h2>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="period" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="open" name="Abiertos" stroke="#0f766e" strokeWidth={2} />
              <Line
                type="monotone"
                dataKey="inProgress"
                name="En proceso"
                stroke="#1d4ed8"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="Resueltos"
                stroke="#16a34a"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-brand-slate/40 bg-white p-4">
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
                fill="#0f766e"
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
