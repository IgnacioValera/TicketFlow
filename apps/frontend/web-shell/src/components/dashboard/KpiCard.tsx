interface KpiCardProps {
  title: string
  value: number
  tone?: 'neutral' | 'danger' | 'success' | 'accent'
}

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'border-slate-200 text-slate-700 before:bg-slate-400',
  danger: 'border-red-200 text-red-700 before:bg-red-600',
  success: 'border-emerald-200 text-emerald-800 before:bg-emerald-600',
  accent: 'border-blue-200 text-blue-800 before:bg-brand-teal',
}

export function KpiCard({ title, value, tone = 'neutral' }: KpiCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded border bg-white px-4 py-3 before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneStyles[tone]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
    </article>
  )
}
