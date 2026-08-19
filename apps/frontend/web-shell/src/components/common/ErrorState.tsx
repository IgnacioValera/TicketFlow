import { PrimaryButton } from '@/components/common/UiControls'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'No se pudo cargar la información.', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-danger/30 bg-red-50 px-6 py-10 text-center" role="alert">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-danger">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-700">{message}</p>
      {onRetry && (
        <PrimaryButton type="button" className="mt-4" onClick={onRetry}>
          Reintentar
        </PrimaryButton>
      )}
    </div>
  )
}
