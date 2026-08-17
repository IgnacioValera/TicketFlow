import { useState, type InputHTMLAttributes } from 'react'
import { AppIcon } from '@/components/common/AppIcon'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function PasswordField({ label, id, className = '', ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const fieldId = id ?? props.name

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-brand-navy">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          className={`w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 pr-11 text-sm focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/10 ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-text"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <AppIcon name={visible ? 'eye-off' : 'eye'} className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
