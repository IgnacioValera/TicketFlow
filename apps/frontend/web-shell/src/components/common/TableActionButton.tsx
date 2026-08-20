import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AppIcon, type AppIconName } from '@/components/common/AppIcon'

type TableActionVariant = 'default' | 'success' | 'warning' | 'danger'

const VARIANT_CLASSES: Record<TableActionVariant, string> = {
  default:
    'border-border bg-white text-primary hover:border-primary hover:bg-page focus-visible:ring-primary/30',
  success:
    'border-green-200 bg-white text-green-700 hover:border-green-400 hover:bg-green-50 focus-visible:ring-green-500/30',
  warning:
    'border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50 focus-visible:ring-amber-500/30',
  danger:
    'border-red-200 bg-white text-brand-scarlet hover:border-brand-scarlet hover:bg-[#fff1ee] focus-visible:ring-brand-scarlet/30',
}

const TOOLTIP_DELAY_MS = 80

interface TableActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: AppIconName
  variant?: TableActionVariant
  to?: string
}

function useFastTooltip() {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = (node: HTMLElement) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const rect = node.getBoundingClientRect()
      setTooltip({ x: rect.left + rect.width / 2, y: rect.top })
    }, TOOLTIP_DELAY_MS)
  }

  const hide = () => {
    window.clearTimeout(timer.current)
    setTooltip(null)
  }

  return { tooltip, show, hide }
}

export function TableActionButton({
  label,
  icon,
  variant = 'default',
  className = '',
  disabled,
  to,
  ...props
}: TableActionButtonProps) {
  const { tooltip, show, hide } = useFastTooltip()
  const classes = [
    'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const iconEl = <AppIcon name={icon} className="h-4 w-4" />

  const control = to ? (
    <Link
      to={to}
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`${classes} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      {iconEl}
    </Link>
  ) : (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {iconEl}
    </button>
  )

  return (
    <>
      <span
        className="inline-flex"
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={hide}
        onFocus={(event) => show(event.currentTarget)}
        onBlur={hide}
      >
        {control}
      </span>
      {tooltip
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded bg-brand-navy px-2 py-1 text-xs font-medium text-white shadow-sm"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  )
}
