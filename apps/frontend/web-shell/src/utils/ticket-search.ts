export const TICKET_SEARCH_MIN_LENGTH = 2
export const TICKET_SEARCH_DEBOUNCE_MS = 300
export const TICKET_SEARCH_LIMIT = 8

export type TicketSearchUiStatus = 'idle' | 'searching' | 'empty' | 'error' | 'results'

export function normalizeTicketSearchQuery(query: string) {
  return query.trim()
}

export function shouldSearchTickets(query: string) {
  return normalizeTicketSearchQuery(query).length >= TICKET_SEARCH_MIN_LENGTH
}

export function resolveTicketSearchUiStatus(input: {
  query: string
  loading: boolean
  error: string
  resultCount: number
}): TicketSearchUiStatus {
  if (!shouldSearchTickets(input.query)) return 'idle'
  if (input.loading) return 'searching'
  if (input.error) return 'error'
  if (input.resultCount === 0) return 'empty'
  return 'results'
}

export function moveTicketSearchIndex(current: number, direction: 1 | -1, count: number) {
  if (count <= 0) return -1
  if (current < 0) return direction === 1 ? 0 : count - 1
  return (current + direction + count) % count
}
