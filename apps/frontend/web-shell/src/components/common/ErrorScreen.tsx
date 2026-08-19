import type { ReactNode } from 'react'
import { BrandMark } from '@/components/common/BrandLogo'

interface ErrorScreenProps {
  kicker: string
  title: string
  description: string
  illustration: ReactNode
  actions: ReactNode
}

export function ErrorScreen({ kicker, title, description, illustration, actions }: ErrorScreenProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-page px-5 py-10">
      <div className="w-full max-w-lg rounded border border-border bg-surface p-6 sm:p-8">
        <BrandMark variant="color" />
        <div className="mt-8 flex justify-center text-primary" aria-hidden>
          {illustration}
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{kicker}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text md:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  )
}

export function MissingRouteIllustration() {
  return (
    <svg width="120" height="72" viewBox="0 0 120 72" fill="none" aria-hidden>
      <rect x="8" y="16" width="64" height="40" rx="6" stroke="currentColor" strokeWidth="2" />
      <path d="M20 28h32M20 38h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="92" cy="36" r="16" stroke="currentColor" strokeWidth="2" />
      <path d="M86 36h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function RestrictedIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
    </svg>
  )
}

export function UnexpectedIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 9v4m0 4h.01M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
    </svg>
  )
}
