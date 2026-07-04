import type { TicketStatus } from '@/types/ticket.types'

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; className: string }
> = {
  OPEN: { label: 'Abierto', className: 'bg-status-open/15 text-status-open' },
  ASSIGNED: { label: 'Asignado', className: 'bg-status-assigned/15 text-status-assigned' },
  IN_PROGRESS: {
    label: 'En proceso',
    className: 'bg-status-in-progress/15 text-status-in-progress',
  },
  WAITING_USER: {
    label: 'En espera',
    className: 'bg-status-waiting-user/15 text-amber-800',
  },
  ESCALATED: { label: 'Escalado', className: 'bg-status-escalated/15 text-status-escalated' },
  RESOLVED: { label: 'Resuelto', className: 'bg-status-resolved/15 text-status-resolved' },
  CLOSED: { label: 'Cerrado', className: 'bg-status-closed/20 text-slate-700' },
  CANCELLED: { label: 'Cancelado', className: 'bg-status-cancelled/20 text-slate-600' },
}

interface StatusBadgeProps {
  status: TicketStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}
