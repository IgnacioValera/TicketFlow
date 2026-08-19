import { LOADER_STATUS_PROPS } from '@/utils/session-gate'

export function PageLoader({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-6" {...LOADER_STATUS_PROPS}>
      <p className="text-sm font-semibold tracking-tight text-text">TicketFlow</p>
      <div className="tf-brand-pulse mt-6" aria-hidden>
        <TicketFlowMark />
      </div>
      <div className="tf-progress mt-8 w-48" aria-hidden>
        <span />
      </div>
      <p className="mt-4 text-sm font-medium text-muted">{label}</p>
    </div>
  )
}

function TicketFlowMark() {
  return (
    <svg width="88" height="28" viewBox="0 0 88 28" fill="none" aria-hidden>
      <path d="M10 14H78" className="tf-flow-line" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="14" r="6" className="tf-flow-node" />
      <circle cx="44" cy="14" r="6" className="tf-flow-node tf-flow-node-mid" />
      <circle cx="78" cy="14" r="6" className="tf-flow-node" />
    </svg>
  )
}
