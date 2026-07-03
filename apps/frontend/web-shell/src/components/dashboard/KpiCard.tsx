interface KpiCardProps {
  title: string
  value: number
  tone?: 'neutral' | 'danger' | 'success' | 'accent'
}

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'border-brand-slate/40 text-brand-navy',
  danger: 'border-brand-scarlet/30 text-brand-scarlet',
  success: 'border-green-500/30 text-green-700',
  accent: 'border-brand-teal/30 text-brand-teal',
}

export function KpiCard({ title, value, tone = 'neutral' }: KpiCardProps) {
  return (
    <article className={`rounded-xl border bg-white p-4 ${toneStyles[tone]}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-3xl font-bold leading-none">{value}</p>
    </article>
  )
}
