interface KpiCardProps {
  title: string
  value: number
  suffix?: string
  tone?: 'neutral' | 'danger' | 'success' | 'accent' | 'warning'
}

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'border-slate-200 text-slate-700 before:bg-slate-400',
  danger: 'border-red-200 text-red-700 before:bg-red-600',
  success: 'border-emerald-200 text-emerald-800 before:bg-emerald-600',
  accent: 'border-blue-200 text-blue-800 before:bg-brand-teal',
  warning: 'border-amber-200 text-amber-800 before:bg-amber-500',
}

export function KpiCard({ title, value, suffix, tone = 'neutral' }: KpiCardProps) {
  const display = suffix === '%' ? value.toFixed(1) : String(value)
  return (
    <article
      className={`relative overflow-hidden rounded border bg-white px-4 py-3 before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneStyles[tone]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold leading-none">
        {display}
        {suffix ? <span className="text-lg">{suffix}</span> : null}
      </p>
    </article>
  )
}
