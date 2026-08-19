import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { InlineSpinner } from '@/components/common/InlineSpinner'

const fieldClass =
  'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-slate-400'

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />
}

export function SelectInput({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldClass} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  )
}

export function TextArea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} min-h-24 ${className}`} {...props} />
}

export function PrimaryButton({
  className = '',
  children,
  type = 'button',
  loading = false,
  loadingText,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  loading?: boolean
  loadingText?: string
}) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={loading || props.disabled}
    >
      {loading ? (
        <>
          <InlineSpinner label={loadingText || 'Procesando'} />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function SecondaryButton({
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-brand-navy hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
