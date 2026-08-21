import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Children, isValidElement } from 'react'
import { InlineSpinner } from '@/components/common/InlineSpinner'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { optionLabelFromChildren, type SearchableSelectOption } from '@/utils/searchable-select'

const fieldClass =
  'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-slate-400'

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />
}

function parseSelectOptions(children: ReactNode): {
  options: SearchableSelectOption[]
  emptyLabel?: string
} {
  const options: SearchableSelectOption[] = []
  let emptyLabel: string | undefined
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return
    const props = (child as ReactElement<{ value?: string | number; children?: ReactNode }>).props
    const value = props.value == null ? '' : String(props.value)
    const label = optionLabelFromChildren(props.children)
    if (value === '') {
      emptyLabel = label
      return
    }
    options.push({ value, label })
  })
  return { options, emptyLabel }
}

export function SelectInput({
  className = '',
  children,
  value,
  onChange,
  disabled,
  id,
  name,
  'aria-label': ariaLabel,
  style,
  menuPlacement = 'bottom',
}: SelectHTMLAttributes<HTMLSelectElement> & { menuPlacement?: 'top' | 'bottom' }) {
  const stringValue = value == null ? '' : String(Array.isArray(value) ? value[0] : value)
  const { options, emptyLabel } = parseSelectOptions(children)

  return (
    <div className={className || 'w-full'}>
      <SearchableSelect
        id={id}
        value={stringValue}
        onChange={(next) => {
          onChange?.({
            target: { value: next, name: name ?? '' },
          } as ChangeEvent<HTMLSelectElement>)
        }}
        options={options}
        placeholder={emptyLabel || 'Seleccionar...'}
        allowEmpty={emptyLabel !== undefined}
        emptyLabel={emptyLabel}
        searchable={false}
        disabled={disabled}
        ariaLabel={typeof ariaLabel === 'string' ? ariaLabel : undefined}
        menuPlacement={menuPlacement}
        style={style as CSSProperties | undefined}
      />
    </div>
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
      className={`inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-brand-navy hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
