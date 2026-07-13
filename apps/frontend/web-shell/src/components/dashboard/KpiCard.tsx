interface KpiCardProps {
  title: string
  value: number
  tone?: 'neutral' | 'danger' | 'success' | 'accent'
}

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'border-[#dfd8e3] text-[#4f4655] before:bg-[#8e8393]',
  danger: 'border-[#efcfca] text-[#c55349] before:bg-[#d96b52]',
  success: 'border-[#cde7da] text-[#287b5c] before:bg-[#45a77e]',
  accent: 'border-[#d9d0f1] text-[#6344c5] before:bg-[#7d5ce1]',
}

export function KpiCard({ title, value, tone = 'neutral' }: KpiCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_9px_28px_rgba(61,45,69,.04)] before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneStyles[tone]}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#817788]">{title}</p>
      <p className="mt-3 text-3xl font-extrabold leading-none">{value}</p>
      <p className="mt-2 text-[11px] font-medium text-[#a096a4]">Actualizado ahora</p>
    </article>
  )
}
