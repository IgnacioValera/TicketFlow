import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import {
  filterSelectOptions,
  moveSelectIndex,
  type SearchableSelectOption,
} from '@/utils/searchable-select'

interface SearchableSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder: string
  searchPlaceholder?: string
  emptyMessage?: string
  noResultsMessage?: string
  disabled?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
}

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay opciones disponibles',
  noResultsMessage = 'Sin coincidencias',
  disabled = false,
  allowEmpty = false,
  emptyLabel = 'Ninguno',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = options.find((item) => item.value === value)
  const visibleOptions = useMemo(() => {
    const filtered = filterSelectOptions(options, query)
    if (!allowEmpty || query.trim()) return filtered
    return [{ value: '', label: emptyLabel }, ...filtered]
  }, [allowEmpty, emptyLabel, options, query])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    setActiveIndex(0)
    window.requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  const choose = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => moveSelectIndex(current, 1, visibleOptions.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => moveSelectIndex(current, -1, visibleOptions.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = visibleOptions[activeIndex] ?? visibleOptions[0]
      if (option) choose(option.value)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((current) => !current)
        }}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-left text-sm text-brand-navy disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`min-w-0 truncate ${selected ? 'text-brand-navy' : 'text-slate-400'}`}>
          {selected ? selected.label : allowEmpty && !value ? emptyLabel : placeholder}
        </span>
        <AppIcon
          name="chevron-down"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded border border-slate-300 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
            <AppIcon name="search" className="h-4 w-4 shrink-0 text-muted" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 min-w-0 flex-1 bg-transparent text-sm text-brand-navy outline-none placeholder:text-slate-400"
            />
          </div>
          <div id={listId} role="listbox" className="max-h-64 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted" role="status">
                {options.length === 0 ? emptyMessage : noResultsMessage}
              </p>
            ) : (
              visibleOptions.map((item, index) => {
                const active = index === activeIndex
                const isSelected = item.value === value || (!item.value && !value)
                return (
                  <button
                    key={item.value || 'empty'}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(item.value)}
                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left ${active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="truncate text-sm text-brand-navy">{item.label}</span>
                    {item.description ? (
                      <span className="truncate text-xs text-muted">{item.description}</span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
