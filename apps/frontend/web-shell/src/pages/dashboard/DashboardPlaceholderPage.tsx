import { useEffect, useMemo, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { TicketsChart } from '@/components/dashboard/TicketsChart'
import { useAuth } from '@/hooks/useAuth'
import * as dashboardService from '@/services/dashboard.service'
import type { DashboardSummary, KpiMetric } from '@/types/dashboard.types'

const KPI_TONE: Record<Exclude<KpiMetric['key'], 'sla'>, 'accent' | 'danger' | 'success' | 'neutral'> = {
  open: 'accent',
  overdue: 'danger',
  resolved: 'success',
  inProgress: 'neutral',
}

function slaTone(value: number): 'success' | 'warning' | 'danger' {
  if (value >= 80) return 'success'
  if (value >= 60) return 'warning'
  return 'danger'
}

export function DashboardPlaceholderPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const scope = useMemo<'GLOBAL' | 'OWN'>(() => {
    if (user?.role === 'AGENT') return 'OWN'
    return 'GLOBAL'
  }, [user?.role])

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

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadSummary()} />
  }

  return (
    <div className="space-y-6">
      <header className="rounded border border-slate-200 bg-[#163a5f] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
          Resumen operativo
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Panel
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {scope === 'OWN'
            ? 'Vista limitada para agente: solo tus indicadores.'
            : 'Vista global del estado operativo de la mesa de ayuda.'}
        </p>
      </header>

      {loading && !summary ? (
        <CardSkeleton />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {(summary?.kpis ?? []).map((kpi) => (
              <KpiCard
                key={kpi.key}
                title={kpi.label}
                value={kpi.value}
                suffix={kpi.key === 'sla' ? '%' : undefined}
                tone={kpi.key === 'sla' ? slaTone(kpi.value) : KPI_TONE[kpi.key]}
              />
            ))}
          </section>

          <TicketsChart trend={summary?.trend ?? []} distribution={summary?.distribution ?? []} />
        </>
      )}
    </div>
  )
}
