import { Link } from 'react-router-dom'

interface KpiCardProps {
  title: string
  value: number
  tone?: 'neutral' | 'danger' | 'success' | 'accent'
  href?: string
  onClick?: () => void
}

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'border-slate-200 text-slate-700 before:bg-slate-400 hover:border-slate-300',
  danger: 'border-red-200 text-red-700 before:bg-red-600 hover:border-red-300',
  success: 'border-emerald-200 text-emerald-800 before:bg-emerald-600 hover:border-emerald-300',
  accent: 'border-blue-200 text-blue-800 before:bg-brand-teal hover:border-blue-300',
}

const interactiveStyles =
  'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal'

export function KpiCard({ title, value, tone = 'neutral', href, onClick }: KpiCardProps) {
  const className = `relative block overflow-hidden rounded border bg-white px-4 py-3 before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneStyles[tone]} ${href || onClick ? interactiveStyles : ''}`

  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
      {(href || onClick) && (
        <p className="mt-2 text-xs font-medium text-brand-teal">Ver listado filtrado</p>
      )}
    </>
  )

  if (href) {
    return (
      <Link to={href} className={className} aria-label={`${title}: ${value}. Ver listado filtrado`}>
        {content}
      </Link>
    )
  }

  return (
    <article className={className}>
      {content}
    </article>
  )
}
