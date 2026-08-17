import { isHexColor } from '@/utils/color'

interface ColorFieldProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function ColorField({ id = 'color', label = 'Color', value, onChange, required }: ColorFieldProps) {
  const pickerValue = isHexColor(value) ? value : '#2563D9'

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Selector de color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded border border-border bg-white p-1"
        />
        <input
          id={id}
          value={value}
          required={required}
          maxLength={7}
          spellCheck={false}
          placeholder="#2563D9"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="w-32 rounded border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
        />
        <span
          className="h-10 w-10 rounded border border-border"
          style={{ backgroundColor: isHexColor(value) ? value : 'transparent' }}
          aria-hidden
        />
      </div>
      <p className="text-xs text-muted">Usa el formato #RRGGBB.</p>
    </div>
  )
}
