import { useDelayedFlag } from '@/hooks/useDelayedFlag'
import { LOADER_STATUS_PROPS } from '@/utils/session-gate'

export type SkeletonVariant = 'table' | 'card' | 'profile' | 'form' | 'ticket' | 'flow'

interface LoadingSkeletonProps {
  rows?: number
  variant?: SkeletonVariant
  label?: string
  delayed?: boolean
}

export function LoadingSkeleton({
  rows = 5,
  variant = 'table',
  label = 'Cargando información…',
  delayed = true,
}: LoadingSkeletonProps) {
  const show = useDelayedFlag(true, delayed ? 160 : 0)
  if (!show) {
    return (
      <p className="sr-only" {...LOADER_STATUS_PROPS}>
        {label}
      </p>
    )
  }

  return (
    <div {...LOADER_STATUS_PROPS}>
      <p className="sr-only">{label}</p>
      {variant === 'card' ? <CardSkeleton /> : null}
      {variant === 'profile' || variant === 'form' ? <FormSkeleton /> : null}
      {variant === 'ticket' ? <TicketSkeleton /> : null}
      {variant === 'flow' ? <FlowSkeleton /> : null}
      {variant === 'table' ? <TableSkeleton rows={rows} /> : null}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="tf-skeleton overflow-hidden rounded border border-border bg-surface">
      <div className="border-b border-border bg-page px-3 py-3">
        <div className="h-3 w-40 rounded bg-brand-slate/25" />
      </div>
      <div className="space-y-2 p-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-9 rounded bg-brand-slate/15" />
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="tf-skeleton grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded border border-border bg-surface p-4">
          <div className="mb-3 h-3 w-1/2 rounded bg-brand-slate/25" />
          <div className="h-8 w-1/3 rounded bg-brand-slate/15" />
        </div>
      ))}
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="tf-skeleton space-y-4 rounded border border-border bg-surface p-6">
      <div className="h-5 w-1/3 rounded bg-brand-slate/25" />
      <div className="h-10 rounded bg-brand-slate/15" />
      <div className="h-10 rounded bg-brand-slate/15" />
      <div className="h-24 rounded bg-brand-slate/10" />
    </div>
  )
}

function TicketSkeleton() {
  return (
    <div className="tf-skeleton space-y-4">
      <div className="h-5 w-40 rounded bg-brand-slate/25" />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-3 rounded border border-border bg-surface p-5">
          <div className="h-6 w-2/3 rounded bg-brand-slate/25" />
          <div className="h-4 w-full rounded bg-brand-slate/15" />
          <div className="h-4 w-5/6 rounded bg-brand-slate/15" />
          <div className="h-32 rounded bg-brand-slate/10" />
        </div>
        <div className="space-y-3 rounded border border-border bg-surface p-5">
          <div className="h-4 w-1/2 rounded bg-brand-slate/25" />
          <div className="h-10 rounded bg-brand-slate/15" />
          <div className="h-10 rounded bg-brand-slate/15" />
        </div>
      </div>
    </div>
  )
}

function FlowSkeleton() {
  return (
    <div className="tf-skeleton rounded border border-border bg-surface p-6">
      <div className="mb-6 h-4 w-48 rounded bg-brand-slate/25" />
      <div className="flex flex-wrap items-center gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="h-16 w-28 rounded bg-brand-slate/15" />
            {index < 4 ? <div className="h-0.5 w-8 bg-brand-slate/20" /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
