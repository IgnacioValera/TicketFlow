import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type TooltipPlacement = 'top' | 'right'

interface QuickTooltipProps {
  label: string
  children: ReactNode
  enabled?: boolean
  placement?: TooltipPlacement
  className?: string
}

export function QuickTooltip({
  label,
  children,
  enabled = true,
  placement = 'right',
  className = 'flex w-full',
}: QuickTooltipProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  if (!enabled) return children

  const show = (node: HTMLElement) => {
    const rect = node.getBoundingClientRect()
    setPosition(
      placement === 'right'
        ? { x: rect.right, y: rect.top + rect.height / 2 }
        : { x: rect.left + rect.width / 2, y: rect.top },
    )
  }

  return (
    <>
      <span
        className={className}
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={() => setPosition(null)}
        onFocus={(event) => show(event.currentTarget)}
        onBlur={() => setPosition(null)}
      >
        {children}
      </span>
      {position
        ? createPortal(
            <span
              role="tooltip"
              className={
                placement === 'right'
                  ? 'pointer-events-none fixed z-[90] ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-brand-navy px-2.5 py-1 text-xs font-medium text-white shadow-md'
                  : 'pointer-events-none fixed z-[90] -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded bg-brand-navy px-2.5 py-1 text-xs font-medium text-white shadow-md'
              }
              style={{ left: position.x, top: position.y }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  )
}
