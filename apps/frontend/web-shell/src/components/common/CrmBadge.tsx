import {
  getActivityStatusLabel,
  getActivityTypeLabel,
  getClientSegmentLabel,
  getClientStatusLabel,
  getClientTierLabel,
  getOpportunityStageLabel,
  getSurveyStatusLabel,
} from '@/utils/labels'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const TONE_CLASS: Record<BadgeTone, string> = {
  info: 'bg-blue-50 text-blue-800',
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-800',
  muted: 'bg-slate-100 text-slate-600',
  neutral: 'bg-slate-100 text-slate-700',
}

export function CrmBadge({
  label,
  tone = 'neutral',
  className = '',
}: {
  label: string
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      {label}
    </span>
  )
}

export function ClientStatusBadge({ status }: { status: string }) {
  const tone: BadgeTone =
    status === 'ACTIVE' ? 'success' : status === 'PROSPECT' ? 'info' : 'muted'
  return <CrmBadge label={getClientStatusLabel(status)} tone={tone} />
}

export function ClientTierBadge({ tier }: { tier: string }) {
  const tone: BadgeTone =
    tier === 'PLATINUM' || tier === 'GOLD' ? 'warning' : tier === 'SILVER' ? 'neutral' : 'muted'
  return <CrmBadge label={getClientTierLabel(tier)} tone={tone} />
}

export function ClientSegmentBadge({ segment }: { segment: string }) {
  return <CrmBadge label={getClientSegmentLabel(segment)} tone="info" />
}

export function OpportunityStageBadge({ stage }: { stage: string }) {
  const tone: BadgeTone =
    stage === 'WON' ? 'success' : stage === 'LOST' ? 'danger' : stage === 'NEGOTIATION' ? 'warning' : 'info'
  return <CrmBadge label={getOpportunityStageLabel(stage)} tone={tone} />
}

export function ActivityTypeBadge({ type }: { type: string }) {
  return <CrmBadge label={getActivityTypeLabel(type)} tone="neutral" />
}

export function ActivityStatusBadge({ status }: { status: string }) {
  const tone: BadgeTone =
    status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'muted' : 'warning'
  return <CrmBadge label={getActivityStatusLabel(status)} tone={tone} />
}

export function SurveyStatusBadge({ status }: { status: string }) {
  const tone: BadgeTone =
    status === 'PUBLISHED' ? 'success' : status === 'CLOSED' ? 'muted' : 'warning'
  return <CrmBadge label={getSurveyStatusLabel(status)} tone={tone} />
}
