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
      <header className="relative overflow-hidden rounded-[22px] border border-[#e1dae4] bg-[#302938] p-6 text-white shadow-[0_16px_45px_rgba(48,41,56,.14)]">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#7d5ce1]/25 blur-3xl" />
        <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-white/45">
          Resumen operativo
        </p>
        <h1 className="relative mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
          Dashboard
        </h1>
        <p className="relative mt-2 text-sm text-white/60">
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
              className="h-28 animate-pulse rounded-2xl border border-brand-slate/30 bg-white"
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
