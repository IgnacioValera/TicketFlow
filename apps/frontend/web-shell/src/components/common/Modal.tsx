import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppIcon } from '@/components/common/AppIcon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  overlayClassName?: string
  closeOnEscape?: boolean
  closable?: boolean
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

const escapeStack: Array<() => void> = []

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  overlayClassName = 'z-50',
  closeOnEscape = true,
  closable = true,
}: ModalProps) {
  const titleId = useId()
  const canDismiss = closable && closeOnEscape

  useEffect(() => {
    if (!open) return
    const closeTop = () => {
      if (canDismiss) onClose()
    }
    escapeStack.push(closeTop)
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (escapeStack[escapeStack.length - 1] !== closeTop) return
      e.preventDefault()
      closeTop()
    }
    document.addEventListener('keydown', handleEscape)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      const index = escapeStack.lastIndexOf(closeTop)
      if (index >= 0) escapeStack.splice(index, 1)
      if (escapeStack.length === 0) document.body.style.overflow = previousOverflow
    }
  }, [open, onClose, canDismiss])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${overlayClassName}`}>
      {closable ? (
        <button
          type="button"
          className="absolute inset-0 bg-brand-navy/50"
          aria-label="Cerrar modal"
          onClick={onClose}
        />
      ) : (
        <div className="absolute inset-0 bg-brand-navy/50" />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-[calc(100vh-2rem)] w-full flex-col ${sizeClasses[size]} rounded border border-slate-200 bg-white shadow-xl`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-brand-navy">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {closable ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="-mr-1 rounded p-1 text-muted hover:bg-slate-100 hover:text-brand-navy"
            >
              <AppIcon name="x" className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  loadingLabel?: string
  overlayClassName?: string
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  loading = false,
  loadingLabel = 'Procesando…',
  overlayClassName = 'z-[60]',
}: ConfirmModalProps) {
  const confirmClass =
    variant === 'danger'
      ? 'bg-danger hover:bg-danger/90'
      : 'bg-primary hover:bg-primary-hover'

  return (
    <Modal
      open={open}
      onClose={onClose}
      overlayClassName={overlayClassName}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-4 py-2 text-sm text-brand-navy hover:bg-slate-50"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              if (loading) return
              onConfirm()
            }}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700">{message}</p>
    </Modal>
  )
}
