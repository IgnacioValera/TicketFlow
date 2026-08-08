import type { ButtonHTMLAttributes } from 'react'
import { AppIcon, type AppIconName } from '@/components/common/AppIcon'

type TableActionVariant = 'default' | 'success' | 'warning' | 'danger'

const VARIANT_CLASSES: Record<TableActionVariant, string> = {
  default:
    'border-[#d4cce0] bg-white text-brand-teal hover:border-brand-teal hover:bg-[#f6f2ff] focus-visible:ring-brand-teal/30',
  success:
    'border-green-200 bg-white text-green-700 hover:border-green-400 hover:bg-green-50 focus-visible:ring-green-500/30',
  warning:
    'border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50 focus-visible:ring-amber-500/30',
  danger:
    'border-red-200 bg-white text-brand-scarlet hover:border-brand-scarlet hover:bg-[#fff1ee] focus-visible:ring-brand-scarlet/30',
}

interface TableActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: AppIconName
  variant?: TableActionVariant
}

export function TableActionButton({
  label,
  icon,
  variant = 'default',
  className = '',
  disabled,
  ...props
}: TableActionButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <AppIcon name={icon} className="h-4 w-4" />
    </button>
  )
}
