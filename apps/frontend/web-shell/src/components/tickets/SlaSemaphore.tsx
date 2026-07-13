import type { TicketSlaStatus } from '@/types/ticket.types'
import { SLA_COLORS, SLA_LABELS } from '@/utils/sla.utils'

interface SlaSemaphoreProps {
  sla: TicketSlaStatus
  compact?: boolean
}

export function SlaSemaphore({ sla, compact = false }: SlaSemaphoreProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${SLA_COLORS[sla.level]}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          sla.level === 'green'
            ? 'bg-sla-green'
            : sla.level === 'yellow'
              ? 'bg-sla-yellow'
              : sla.level === 'orange'
                ? 'bg-sla-orange'
                : 'bg-sla-red'
        }`}
        aria-hidden
      />
      <span>{SLA_LABELS[sla.level]}</span>
      {!compact && (
        <span className="text-xs opacity-80">{sla.percentRemaining.toFixed(0)}% restante</span>
      )}
    </div>
  )
}
