interface LoadingSkeletonProps {
  rows?: number
  variant?: 'table' | 'card' | 'profile'
}

export function LoadingSkeleton({ rows = 5, variant = 'table' }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-brand-slate/30 p-4">
            <div className="mb-2 h-4 w-1/2 rounded bg-brand-slate/30" />
            <div className="h-8 w-1/3 rounded bg-brand-slate/20" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'profile') {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-brand-slate/30 bg-white p-6">
        <div className="h-6 w-1/3 rounded bg-brand-slate/30" />
        <div className="h-4 w-2/3 rounded bg-brand-slate/20" />
        <div className="h-4 w-1/2 rounded bg-brand-slate/20" />
      </div>
    )
  }

  return (
    <div className="animate-pulse space-y-3 rounded-xl border border-brand-slate/30 bg-white p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-brand-slate/20" />
      ))}
    </div>
  )
}
