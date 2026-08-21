import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppIcon } from '@/components/common/AppIcon'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { CrmDashboard } from '@/types/crm.types'
import { formatMoney, getOpportunityStageLabel } from '@/utils/labels'

export function CrmDashboardPage() {
  const { hasPermission } = usePermissions()
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

  if (error || (!loading && !data)) {
    return <ErrorState message={error || 'No hay información disponible'} onRetry={load} />
  }

  if (loading && !data) {
    return <CardSkeleton />
  }

  const dashboard = data!
  const chart = dashboard.pipeline.map((item) => ({
    etapa: getOpportunityStageLabel(item.stage),
    monto: item.amount,
    count: item.count,
  }))
  const pipelineTotal = dashboard.pipeline.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Clientes"
          value={dashboard.activeClients}
          tone="accent"
          href="/crm/clients"
          cta="Ver listado"
        />
        <KpiCard
          title="Embudo de ventas"
          value={formatMoney(pipelineTotal)}
          tone="neutral"
          href="/crm/opportunities"
          cta="Ver oportunidades"
        />
        <KpiCard
          title="Ganadas"
          value={dashboard.wonThisMonth}
          tone="success"
          href="/crm/opportunities"
          cta="Ver oportunidades"
        />
        <KpiCard title="NPS" value={dashboard.nps.nps} tone="accent" href="/crm/surveys" cta="Ver encuestas" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/crm/clients"
          className="rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-navy transition hover:border-brand-teal hover:shadow-sm"
        >
          Ver clientes
        </Link>
        <Link
          href="/crm/opportunities"
          className="rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-navy transition hover:border-brand-teal hover:shadow-sm"
        >
          Ver oportunidades
        </Link>
        <Link
          href="/crm/activities"
          className="rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-navy transition hover:border-brand-teal hover:shadow-sm"
        >
          Ver actividades
        </Link>
        {hasPermission(PERMISSIONS.CRM_CLIENT_CREATE) && (
          <Link
            href="/crm/clients?nuevo=1"
            className="inline-flex items-center gap-2 rounded border border-brand-teal/30 bg-brand-teal/5 px-4 py-3 text-sm font-medium text-brand-teal transition hover:bg-brand-teal/10"
          >
            <AppIcon name="plus" className="h-4 w-4" />
            Nuevo cliente
          </Link>
        )}
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-brand-navy">Embudo de ventas</h2>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="etapa" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="monto" fill="#1d4ed8" name="Importe" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-brand-navy">Actividad comercial</h2>
          <p className="mt-3 text-2xl font-semibold leading-none text-brand-navy">{dashboard.activitiesDue}</p>
          <p className="mt-2 text-sm text-muted">Actividades próximas</p>
          <p className="mt-3 text-sm text-muted">Conversión del embudo: {dashboard.conversionRate}%</p>
        </section>
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-brand-navy">Satisfacción / NPS</h2>
          <p className="mt-3 text-2xl font-semibold leading-none text-brand-navy">{dashboard.nps.nps}</p>
          <p className="mt-2 text-sm text-muted">
            Promotores {dashboard.nps.promoters} · Pasivos {dashboard.nps.passives} · Detractores {dashboard.nps.detractors}
          </p>
        </section>
      </div>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-brand-navy">Clientes con mayor puntuación</h2>
        {dashboard.topClients.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No hay información disponible</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {dashboard.topClients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/crm/clients/${client.id}`}
                  className="flex justify-between px-1 py-2 text-sm text-text transition hover:bg-slate-50"
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
