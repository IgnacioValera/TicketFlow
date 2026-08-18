import { useCallback, useEffect, useRef, useState } from 'react'
import * as ticketService from '@/services/ticket.service'
import type { Ticket } from '@/types/ticket.types'
import { getErrorMessages } from '@/utils/errors'
import {
  TICKET_SEARCH_DEBOUNCE_MS,
  TICKET_SEARCH_LIMIT,
  normalizeTicketSearchQuery,
  resolveTicketSearchUiStatus,
  shouldSearchTickets,
} from '@/utils/ticket-search'

export function useTicketSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!shouldSearchTickets(query)) {
      requestIdRef.current += 1
      setResults([])
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')

    const timer = window.setTimeout(() => {
      const requestId = ++requestIdRef.current
      void ticketService
        .getTickets({
          search: normalizeTicketSearchQuery(query),
          page: 1,
          perPage: TICKET_SEARCH_LIMIT,
        })
        .then((response) => {
          if (requestId !== requestIdRef.current) return
          setResults(response.data)
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (requestId !== requestIdRef.current) return
          setResults([])
          setLoading(false)
          setError(getErrorMessages(err, 'Error al buscar')[0])
        })
    }, TICKET_SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query])

  const clear = useCallback(() => {
    requestIdRef.current += 1
    setQuery('')
    setResults([])
    setLoading(false)
    setError('')
  }, [])

  const status = resolveTicketSearchUiStatus({
    query,
    loading,
    error,
    resultCount: results.length,
  })

  return { query, setQuery, results, loading, error, status, clear }
}
