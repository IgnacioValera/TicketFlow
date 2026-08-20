import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { DashboardTicketList } from '@/components/dashboard/DashboardTicketList'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { SlaAlertsBanner } from '@/components/dashboard/SlaAlertsBanner'
import { TicketsChart } from '@/components/dashboard/TicketsChart'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as dashboardService from '@/services/dashboard.service'
import type { DashboardSummary, KpiMetric } from '@/types/dashboard.types'
import { kpiFilterHref } from '@/utils/dashboard.utils'

const KPI_TONE: Record<KpiMetric['key'], 'accent' | 'danger' | 'success' | 'neutral'> = {
  open: 'accent',
  overdue: 'danger',
  inProgress: 'neutral',
  resolved: 'success',
  closed: 'neutral',
}

export function DashboardPlaceholderPage() {
  const { hasPermission } = usePermissions()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const scope = useMemo<'GLOBAL' | 'OWN'>(() => {
    if (hasPermission(PERMISSIONS.DASHBOARD_VIEW_LIMITED) && !hasPermission(PERMISSIONS.DASHBOARD_VIEW)) return 'OWN'
    return 'GLOBAL'
  }, [hasPermission])

  const loadSummary = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await dashboardService.getDashboardSummary(scope)
      setSummary(data)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudo cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [scope])

  const showUnassignedLink = hasPermission(PERMISSIONS.TICKET_ASSIGN) || hasPermission(PERMISSIONS.TICKET_REASSIGN)

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadSummary()} />
  }

  if (loading && !summary) {
    return <CardSkeleton />
  }

  const hasTickets = (summary?.kpis ?? []).some((kpi) => kpi.value > 0)

  return (
    <div className="space-y-6">
      {summary?.slaAlerts && <SlaAlertsBanner alerts={summary.slaAlerts} />}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {(summary?.kpis ?? []).map((kpi) => (
          <KpiCard
            key={kpi.key}
            title={kpi.label}
            value={kpi.value}
            tone={KPI_TONE[kpi.key]}
            href={kpiFilterHref(kpi.key)}
          />
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/tickets"
          className="rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-navy transition hover:border-brand-teal hover:shadow-sm"
        >
          Ver todos los tickets
        </Link>
        {showUnassignedLink && (
          <Link
            to="/tickets?unassigned=true"
            className="rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-navy transition hover:border-brand-teal hover:shadow-sm"
          >
            Tickets sin asignar
          </Link>
        )}
        <Link
          to="/tickets?slaStatus=overdue"
          className="rounded border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 transition hover:border-red-300 hover:shadow-sm"
        >
          Tickets vencidos
        </Link>
        {hasPermission(PERMISSIONS.TICKET_CREATE) && (
          <Link
            to="/tickets/create"
            className="inline-flex items-center gap-2 rounded border border-brand-teal/30 bg-brand-teal/5 px-4 py-3 text-sm font-medium text-brand-teal transition hover:bg-brand-teal/10"
          >
            <AppIcon name="plus" className="h-4 w-4" />
            Crear ticket
          </Link>
        )}
      </section>

      {!hasTickets ? (
        <EmptyState
          title="Sin tickets registrados"
          description="Cuando existan solicitudes en la mesa de ayuda, aquí verás indicadores y listados recientes."
          action={
            hasPermission(PERMISSIONS.TICKET_CREATE) ? (
              <Link
                to="/tickets/create"
                className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <AppIcon name="plus" className="h-4 w-4" />
                Crear primer ticket
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardTicketList
              title="Tickets recientes"
              tickets={summary?.recentTickets ?? []}
              emptyTitle="No hay tickets recientes"
              emptyDescription="Los últimos tickets creados aparecerán aquí."
              viewAllHref="/tickets"
            />
            <DashboardTicketList
              title="Requieren atención"
              tickets={summary?.urgentTickets ?? []}
              emptyTitle="Nada urgente por ahora"
              emptyDescription="Los tickets vencidos, críticos o con SLA en riesgo se mostrarán aquí."
              viewAllHref="/tickets?slaStatus=warning"
            />
          </div>

          <TicketsChart trend={summary?.trend ?? []} distribution={summary?.distribution ?? []} />
        </>
      )}
    </div>
  )
}
