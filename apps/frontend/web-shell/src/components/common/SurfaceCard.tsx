import type { ReactNode } from 'react'

export function SurfaceCard({
  as: Tag = 'section',
  className = '',
  children,
}: {
  as?: 'section' | 'article' | 'div' | 'aside'
  className?: string
  children: ReactNode
}) {
  return <Tag className={`ui-card ${className}`}>{children}</Tag>
}
