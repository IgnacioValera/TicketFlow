import { BrandLogo } from '@/components/common/BrandLogo'
import { LOADER_STATUS_PROPS } from '@/utils/session-gate'

export function PageLoader({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-page px-6"
      {...LOADER_STATUS_PROPS}
    >
      <BrandLogo size={48} />
      <p className="mt-4 text-sm font-semibold tracking-tight text-text">TicketFlow</p>
      <div className="tf-progress mt-8 w-48" aria-hidden>
        <span />
      </div>
      <p className="mt-4 text-sm font-medium text-muted">{label}</p>
    </div>
  )
}
