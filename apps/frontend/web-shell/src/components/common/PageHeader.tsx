import type { ReactNode } from 'react'

interface PageHeaderProps {
  kicker?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ kicker, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {kicker && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {kicker}
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-brand-navy">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
