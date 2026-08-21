import Link from 'next/link'

interface KpiCardProps {
  title: string
  value: number | string
  suffix?: string
  tone?: 'neutral' | 'danger' | 'success' | 'accent' | 'warning'
  href?: string
  onClick?: () => void
  cta?: string
}

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'border-slate-200 text-slate-700 before:bg-slate-400 hover:border-slate-300',
  danger: 'border-red-200 text-red-700 before:bg-red-600 hover:border-red-300',
  success: 'border-emerald-200 text-emerald-800 before:bg-emerald-600 hover:border-emerald-300',
  accent: 'border-blue-200 text-blue-800 before:bg-brand-teal hover:border-blue-300',
  warning: 'border-amber-200 text-amber-800 before:bg-amber-500 hover:border-amber-300',
}

const interactiveStyles =
  'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal'

export function KpiCard({ title, value, suffix, tone = 'neutral', href, onClick, cta = 'Ver listado filtrado' }: KpiCardProps) {
  const display = typeof value === 'number' && suffix === '%' ? value.toFixed(1) : String(value)
  const className = `relative block overflow-hidden rounded border bg-white px-4 py-3 before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneStyles[tone]} ${href || onClick ? interactiveStyles : ''}`

  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold leading-none">
        {display}
        {suffix ? <span className="text-lg">{suffix}</span> : null}
      </p>
      {(href || onClick) && cta ? (
        <p className="mt-2 text-xs font-medium text-brand-teal">{cta}</p>
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`${title}: ${display}${suffix ?? ''}${cta ? `. ${cta}` : ''}`}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" className={`${className} w-full text-left`} onClick={onClick} aria-label={`${title}: ${display}${suffix ?? ''}`}>
        {content}
      </button>
    )
  }

  return <article className={className}>{content}</article>
}
