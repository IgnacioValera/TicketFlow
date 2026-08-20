import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ActivityStatusBadge,
  ActivityTypeBadge,
  ClientSegmentBadge,
  ClientStatusBadge,
  ClientTierBadge,
  OpportunityStageBadge,
} from '@/components/common/CrmBadge'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { AppIcon } from '@/components/common/AppIcon'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { Customer360 } from '@/types/crm.types'
import {
  formatDate,
  formatMoney,
  getClientSegmentLabel,
  getClientTierLabel,
  getTimelineTypeLabel,
} from '@/utils/labels'

const TABS = ['Resumen', 'Contactos', 'Oportunidades', 'Actividades', 'Tickets', 'Encuestas'] as const

export function Client360Page() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [data, setData] = useState<Customer360 | null>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Resumen')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    void crm
      .getClient360(id)
      .then(setData)
      .catch((err: { message?: string }) => setError(err.message || 'No se pudo cargar la información.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSkeleton variant="profile" />
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link to="/crm/clients" className="text-sm text-brand-teal hover:underline">
          ← Clientes
        </Link>
        <ErrorState message={error || 'Cliente no encontrado'} />
      </div>
    )
  }

  const { client } = data

  return (
    <div className="space-y-5">
      <div>
        <Link to="/crm/clients" className="text-sm text-brand-teal hover:underline">
          ← Clientes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-text">{client.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {client.industry || 'Sin industria'} · {getClientSegmentLabel(client.segment)} ·{' '}
              {getClientTierLabel(client.tier)}
              <span>· Responsable: {client.ownerName || 'Sin asignar'}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission(PERMISSIONS.CRM_CLIENT_EDIT) && (
              <SecondaryButton onClick={() => navigate(`/crm/clients?editar=${client.id}`)}>
                <AppIcon name="edit" className="h-4 w-4" />
                Editar cliente
              </SecondaryButton>
            )}
            {hasPermission(PERMISSIONS.CRM_OPPORTUNITY_CREATE) && (
              <PrimaryButton onClick={() => navigate(`/crm/opportunities?nuevo=1&cliente=${client.id}`)}>
                <AppIcon name="plus" className="h-4 w-4" />
                Nueva oportunidad
              </PrimaryButton>
            )}
            {hasPermission(PERMISSIONS.CRM_ACTIVITY_CREATE) && (
              <SecondaryButton onClick={() => navigate('/crm/activities?nuevo=1')}>
                <AppIcon name="plus" className="h-4 w-4" />
                Nueva actividad
              </SecondaryButton>
            )}
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Contactos" value={data.kpis.contacts} tone="accent" />
        <KpiCard title="Oportunidades" value={data.kpis.openOpportunities} tone="neutral" />
        <KpiCard title="Tickets" value={data.kpis.openTickets} tone="accent" />
        <KpiCard title="Actividades" value={data.activities.length} tone="neutral" />
      </section>

      <KpiCard title="Puntuación del cliente" value={`${data.kpis.score} / 100`} tone="success" />

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`border-b-2 px-3 py-2 text-sm ${tab === item ? 'border-brand-teal font-semibold text-brand-teal' : 'border-transparent text-muted hover:text-text'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Resumen' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <section className="space-y-2 rounded border border-slate-200 bg-white p-4 text-sm">
            <p>
              {client.email} · {client.phone}
            </p>
            <div className="flex flex-wrap gap-2">
              <ClientStatusBadge status={client.status} />
              <ClientSegmentBadge segment={client.segment} />
              <ClientTierBadge tier={client.tier} />
            </div>
            <p className="text-muted">
              {client.region || 'Sin región'} · ganado {formatMoney(data.kpis.wonAmount)}
            </p>
          </section>
          <section className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-brand-navy">Actividad reciente</h2>
            {data.timeline.length === 0 ? (
              <p className="text-sm text-muted">No hay información disponible</p>
            ) : (
              <ul className="space-y-2 text-sm text-text">
                {data.timeline.slice(0, 8).map((item) => (
                  <li key={`${item.type}-${item.id}`} className="flex gap-2">
                    <span className="w-24 shrink-0 text-xs text-muted">{formatDate(item.at)}</span>
                    <span>
                      {getTimelineTypeLabel(item.type)} · {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'Contactos' && (
        <ul className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {data.contacts.length === 0 && <li className="p-4 text-sm text-muted">Aún no hay contactos registrados.</li>}
          {data.contacts.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              <p className="font-medium text-text">
                {item.firstName} {item.lastName}
              </p>
              <p className="text-muted">
                {item.email} · {item.jobTitle || 'Sin puesto'}
              </p>
            </li>
          ))}
        </ul>
      )}
      {tab === 'Oportunidades' && (
        <ul className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {data.opportunities.length === 0 && (
            <li className="p-4 text-sm text-muted">Aún no hay oportunidades registradas.</li>
          )}
          {data.opportunities.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <button
                type="button"
                className="text-left"
                onClick={() => navigate(`/crm/opportunities?editar=${item.id}`)}
              >
                <span className="font-medium text-brand-teal hover:underline">{item.title}</span>
                {' · '}
                {formatMoney(item.amount)}
              </button>
              <OpportunityStageBadge stage={item.stage} />
            </li>
          ))}
        </ul>
      )}
      {tab === 'Actividades' && (
        <ul className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {data.activities.length === 0 && <li className="p-4 text-sm text-muted">No hay actividades pendientes.</li>}
          {data.activities.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>{item.subject}</span>
              <span className="flex gap-2">
                <ActivityTypeBadge type={item.type} />
                <ActivityStatusBadge status={item.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {tab === 'Tickets' && (
        <ul className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {data.tickets.length === 0 && <li className="p-4 text-sm text-muted">No hay información disponible</li>}
          {data.tickets.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              <Link className="font-medium text-brand-teal hover:underline" to={`/tickets/${item.id}`}>
                {item.folio}
              </Link>{' '}
              {item.title}
            </li>
          ))}
        </ul>
      )}
      {tab === 'Encuestas' && (
        <div className="rounded border border-slate-200 bg-white p-4 text-sm text-muted">
          Las encuestas se envían al ganar una oportunidad. Consulta el módulo de encuestas para ver resultados.
          <div className="mt-3">
            <PrimaryButton onClick={() => navigate('/crm/surveys')}>Ver encuestas</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}
