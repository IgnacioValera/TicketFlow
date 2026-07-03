import { useEffect, useMemo, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { TicketsChart } from '@/components/dashboard/TicketsChart'
import { useAuth } from '@/hooks/useAuth'
import * as dashboardService from '@/services/dashboard.service'
import type { DashboardSummary, KpiMetric } from '@/types/dashboard.types'

const KPI_TONE: Record<KpiMetric['key'], 'accent' | 'danger' | 'success' | 'neutral'> = {
  open: 'accent',
  overdue: 'danger',
  resolved: 'success',
  inProgress: 'neutral',
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
      <header className="rounded-xl border border-brand-slate/40 bg-white p-5">
        <h1 className="text-2xl font-bold text-brand-navy">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          {scope === 'OWN'
            ? 'Vista limitada para agente: solo tus indicadores.'
            : 'Vista global del estado operativo de la mesa de ayuda.'}
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-brand-slate/30 bg-white"
            />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(summary?.kpis ?? []).map((kpi) => (
              <KpiCard key={kpi.key} title={kpi.label} value={kpi.value} tone={KPI_TONE[kpi.key]} />
            ))}
          </section>

          <TicketsChart trend={summary?.trend ?? []} distribution={summary?.distribution ?? []} />
        </>
      )}
    </div>
  )
}
