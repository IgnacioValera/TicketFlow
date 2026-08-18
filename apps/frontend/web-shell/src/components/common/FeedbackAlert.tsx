import { AppIcon } from '@/components/common/AppIcon'

interface FeedbackAlertProps {
  title: string
  message?: string
  variant?: 'success' | 'danger'
  className?: string
}

export function FeedbackAlert({
  title,
  message,
  variant = 'success',
  className = '',
}: FeedbackAlertProps) {
  const isSuccess = variant === 'success'
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-sm ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
          : 'border-danger/30 bg-red-50 text-danger'
      } ${className}`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
          isSuccess ? 'bg-emerald-600 text-white' : 'bg-danger text-white'
        }`}
        aria-hidden
      >
        <AppIcon name={isSuccess ? 'check' : 'bell'} className="h-4 w-4" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {message && <p className="mt-0.5 text-sm leading-5 opacity-90">{message}</p>}
      </div>
    </div>
  )
}

export function ConfirmToast({
  open,
  title,
  message,
}: {
  open: boolean
  title: string
  message: string
}) {
  if (!open) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-lg">
        <FeedbackAlert title={title} message={message} />
      </div>
    </div>
  )
}
