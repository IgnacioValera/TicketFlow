import Link from 'next/link'
import type { DashboardSlaAlerts } from '@/types/dashboard.types'

interface SlaAlertsBannerProps {
  alerts: DashboardSlaAlerts
}

export function SlaAlertsBanner({ alerts }: SlaAlertsBannerProps) {
  if (alerts.overdueCount === 0 && alerts.warningCount === 0) return null

  return (
    <section
      className={`rounded border px-4 py-3 ${
        alerts.overdueCount > 0
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {alerts.overdueCount > 0 ? 'Alertas SLA críticas' : 'Tickets próximos a vencer'}
          </p>
          <p className="mt-1 text-sm">
            {alerts.overdueCount > 0 && (
              <span>
                {alerts.overdueCount} ticket{alerts.overdueCount === 1 ? '' : 's'} vencido
                {alerts.overdueCount === 1 ? '' : 's'}
              </span>
            )}
            {alerts.overdueCount > 0 && alerts.warningCount > 0 && ' · '}
            {alerts.warningCount > 0 && (
              <span>
                {alerts.warningCount} con SLA en riesgo
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {alerts.overdueCount > 0 && (
            <Link
              href="/tickets?slaStatus=overdue"
              className="rounded bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
            >
              Ver vencidos
            </Link>
          )}
          {alerts.warningCount > 0 && (
            <Link
              href="/tickets?slaStatus=warning"
              className="rounded bg-white px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-100"
            >
              Ver en riesgo
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
