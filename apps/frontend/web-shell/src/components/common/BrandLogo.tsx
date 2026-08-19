import logoUrl from '@/assets/ticketflow-logo.svg'

interface BrandLogoProps {
  variant?: 'color' | 'white'
  size?: number
  className?: string
  decorative?: boolean
}

export function BrandLogo({
  variant = 'color',
  size = 32,
  className = '',
  decorative = false,
}: BrandLogoProps) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      decoding="async"
      alt={decorative ? '' : 'Logo de TicketFlow'}
      aria-hidden={decorative || undefined}
      className={`inline-block shrink-0 ${variant === 'white' ? 'brightness-0 invert' : ''} ${className}`}
    />
  )
}

export function BrandMark({
  collapsed = false,
  variant = 'white',
}: {
  collapsed?: boolean
  variant?: 'color' | 'white'
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandLogo variant={variant} size={32} decorative />
      {!collapsed && (
        <span className="min-w-0 text-left">
          <span className="block truncate text-sm font-semibold leading-tight">TicketFlow</span>
          <span
            className={`block truncate text-[10px] leading-tight ${variant === 'white' ? 'text-white/65' : 'text-muted'}`}
          >
            CRM y mesa de ayuda
          </span>
        </span>
      )}
    </span>
  )
}
