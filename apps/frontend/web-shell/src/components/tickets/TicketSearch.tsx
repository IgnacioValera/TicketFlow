import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useTicketSearch } from '@/hooks/useTicketSearch'
import type { Ticket } from '@/types/ticket.types'
import { moveTicketSearchIndex } from '@/utils/ticket-search'

function PriorityChip({ ticket }: { ticket: Ticket }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{
        color: ticket.priorityColor || 'var(--color-primary)',
        backgroundColor: ticket.priorityColor
          ? `${ticket.priorityColor}18`
          : 'color-mix(in srgb, var(--color-primary) 14%, white)',
      }}
    >
      {ticket.priorityName}
    </span>
  )
}

export function TicketSearch() {
  const navigate = useNavigate()
  const { query, setQuery, results, status, clear } = useTicketSearch()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const showDropdown = open && status !== 'idle'

  useEffect(() => {
    if (status === 'idle') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    setOpen(true)
    setActiveIndex(status === 'results' ? 0 : -1)
  }, [status, results])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const openTicket = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`)
    clear()
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }

    if (!showDropdown || status !== 'results') return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => moveTicketSearchIndex(current, 1, results.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => moveTicketSearchIndex(current, -1, results.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const ticket = results[activeIndex] ?? results[0]
      if (ticket) openTicket(ticket)
    }
  }

  const activeOptionId =
    showDropdown && status === 'results' && activeIndex >= 0
      ? `${listId}-option-${results[activeIndex]?.id}`
      : undefined

  return (
    <div ref={containerRef} className="relative min-w-0 max-w-sm flex-1">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Buscar tickets
      </label>
      <div className="flex h-9 items-center gap-2 rounded border border-border bg-page px-3 text-sm focus-within:border-primary">
        <AppIcon name="search" className="h-4 w-4 shrink-0 text-muted" />
        <input
          id={`${listId}-input`}
          ref={inputRef}
          type="search"
          role="combobox"
          autoComplete="off"
          placeholder="Buscar tickets..."
          value={query}
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          onFocus={() => {
            if (status !== 'idle') setOpen(true)
          }}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
        />
        {query && (
          <button
            type="button"
            className="text-xs text-muted hover:text-text"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              clear()
              inputRef.current?.focus()
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded border border-border bg-surface shadow-lg"
        >
          {status === 'searching' && (
            <p className="px-3 py-2.5 text-sm text-muted" role="status">
              Buscando...
            </p>
          )}
          {status === 'empty' && (
            <p className="px-3 py-2.5 text-sm text-muted" role="status">
              Sin resultados
            </p>
          )}
          {status === 'error' && (
            <p className="px-3 py-2.5 text-sm text-danger" role="alert">
              Error al buscar
            </p>
          )}
          {status === 'results' &&
            results.map((ticket, index) => {
              const selected = index === activeIndex
              return (
                <button
                  key={ticket.id}
                  id={`${listId}-option-${ticket.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openTicket(ticket)}
                  className={`flex w-full flex-col gap-1 px-3 py-2 text-left ${selected ? 'bg-page' : 'hover:bg-page'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {ticket.folio}
                    </span>
                    <PriorityChip ticket={ticket} />
                  </span>
                  <span className="line-clamp-1 text-sm font-medium text-text">{ticket.title}</span>
                  <StatusBadge status={ticket.status} className="w-fit px-2 py-0.5" />
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}
