import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import { PageHeader } from '@/components/common/PageHeader'
import * as crm from '@/services/crm.service'
import type { CrmDashboard } from '@/types/crm.types'
import { formatMoney, getOpportunityStageLabel } from '@/utils/labels'

export function CrmDashboardPage() {
  const [data, setData] = useState<CrmDashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError('')
    void crm
      .getCrmDashboard()
      .then(setData)
      .catch((err: { message?: string }) => setError(err.message || 'No se pudo cargar la información.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <CardSkeleton />
  if (error || !data) return <ErrorState message={error || 'No hay información disponible'} onRetry={load} />

  const chart = data.pipeline.map((item) => ({
    etapa: getOpportunityStageLabel(item.stage),
    monto: item.amount,
    count: item.count,
  }))
  const pipelineTotal = data.pipeline.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-5">
      <PageHeader kicker="CRM" title="Panel CRM" description="Indicadores comerciales, embudo de ventas y satisfacción." />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Clientes', String(data.activeClients)],
          ['Embudo de ventas', formatMoney(pipelineTotal)],
          ['Ganadas', String(data.wonThisMonth)],
          ['NPS', String(data.nps.nps)],
        ].map(([label, value]) => (
          <article key={label} className="rounded border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-brand-navy">{value}</p>
          </article>
        ))}
      </section>
      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-brand-navy">Embudo de ventas</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="etapa" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="monto" fill="#1d4ed8" name="Importe" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-navy">Actividad comercial</h2>
          <p className="text-3xl font-semibold text-brand-navy">{data.activitiesDue}</p>
          <p className="mt-1 text-sm text-slate-500">Actividades próximas</p>
          <p className="mt-3 text-sm text-slate-600">Conversión del embudo: {data.conversionRate}%</p>
        </section>
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-navy">Satisfacción / NPS</h2>
          <p className="text-3xl font-semibold text-brand-navy">{data.nps.nps}</p>
          <p className="mt-2 text-sm text-slate-600">
            Promotores {data.nps.promoters} · Pasivos {data.nps.passives} · Detractores {data.nps.detractors}
          </p>
        </section>
      </div>
      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-brand-navy">Clientes con mayor puntuación</h2>
        {data.topClients.length === 0 ? (
          <p className="text-sm text-slate-500">No hay información disponible</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.topClients.map((client) => (
              <li key={client.id}>
                <Link
                  to={`/crm/clients/${client.id}`}
                  className="flex justify-between px-1 py-2 text-sm hover:bg-slate-50"
                >
                  <span>{client.name}</span>
                  <span className="font-semibold">{client.score}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
