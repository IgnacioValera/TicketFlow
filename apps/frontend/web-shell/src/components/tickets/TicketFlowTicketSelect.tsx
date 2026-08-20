import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { TICKET_FLOW_COPY } from '@/pages/tickets/ticket-flow-copy'
import type { Ticket } from '@/types/ticket.types'
import { filterTicketsByQuery } from '@/utils/ticket-flow'
import { moveTicketSearchIndex } from '@/utils/ticket-search'

interface TicketFlowTicketSelectProps {
  tickets: Ticket[]
  value: string
  onChange: (ticketId: string) => void
  resetKey?: string
}

export function TicketFlowTicketSelect({ tickets, value, onChange, resetKey }: TicketFlowTicketSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = tickets.find((item) => item.id === value)
  const matches = useMemo(() => filterTicketsByQuery(tickets, query), [tickets, query])

  useEffect(() => {
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
  }, [resetKey])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
    window.requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  const choose = (ticketId: string) => {
    onChange(ticketId)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => moveTicketSearchIndex(current, 1, matches.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => moveTicketSearchIndex(current, -1, matches.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const ticket = matches[activeIndex] ?? matches[0]
      if (ticket) choose(ticket.id)
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-[220px] flex-1">
      <button
        type="button"
        aria-label="Seleccionar ticket"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded border border-border bg-surface px-3.5 py-2 text-left text-sm font-medium"
      >
        <span className={`min-w-0 truncate ${selected ? 'text-text' : 'text-muted'}`}>
          {selected ? `${selected.folio} · ${selected.title}` : TICKET_FLOW_COPY.selectTicket}
        </span>
        <AppIcon name="chevron-down" className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
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
              placeholder={TICKET_FLOW_COPY.searchTicket}
              aria-label={TICKET_FLOW_COPY.searchTicket}
              className="h-8 min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
            />
          </div>
          <div id={listId} role="listbox" aria-label="Tickets" className="max-h-64 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted" role="status">
                {tickets.length === 0 ? TICKET_FLOW_COPY.noFilterResults : TICKET_FLOW_COPY.noSearchResults}
              </p>
            ) : (
              matches.map((item, index) => {
                const active = index === activeIndex
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    data-ticket-id={item.id}
                    aria-selected={item.id === value}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(item.id)}
                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left ${active ? 'bg-page' : 'hover:bg-page'}`}
                  >
                    <span className="font-mono text-xs font-semibold text-primary">{item.folio}</span>
                    <span className="line-clamp-1 text-sm text-text">{item.title}</span>
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
