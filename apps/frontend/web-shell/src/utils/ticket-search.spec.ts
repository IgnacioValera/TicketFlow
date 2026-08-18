import { describe, expect, it } from 'vitest'
import {
  TICKET_SEARCH_MIN_LENGTH,
  moveTicketSearchIndex,
  normalizeTicketSearchQuery,
  resolveTicketSearchUiStatus,
  shouldSearchTickets,
} from '@/utils/ticket-search'

describe('Búsqueda de tickets', () => {
  it('no dispara búsqueda con menos de dos caracteres', () => {
    expect(TICKET_SEARCH_MIN_LENGTH).toBe(2)
    expect(shouldSearchTickets('')).toBe(false)
    expect(shouldSearchTickets(' ')).toBe(false)
    expect(shouldSearchTickets('H')).toBe(false)
    expect(shouldSearchTickets(' H ')).toBe(false)
  })

  it('dispara búsqueda desde dos caracteres, ignorando espacios', () => {
    expect(shouldSearchTickets('HD')).toBe(true)
    expect(shouldSearchTickets('  HD-  ')).toBe(true)
    expect(normalizeTicketSearchQuery('  HD-2026  ')).toBe('HD-2026')
  })

  it('resuelve estados de UI: buscando, sin resultados y error', () => {
    expect(
      resolveTicketSearchUiStatus({ query: 'HD', loading: true, error: '', resultCount: 0 }),
    ).toBe('searching')
    expect(
      resolveTicketSearchUiStatus({ query: 'HD', loading: false, error: '', resultCount: 0 }),
    ).toBe('empty')
    expect(
      resolveTicketSearchUiStatus({
        query: 'HD',
        loading: false,
        error: 'Error al buscar',
        resultCount: 0,
      }),
    ).toBe('error')
    expect(
      resolveTicketSearchUiStatus({ query: 'HD', loading: false, error: '', resultCount: 3 }),
    ).toBe('results')
    expect(
      resolveTicketSearchUiStatus({ query: 'H', loading: true, error: '', resultCount: 2 }),
    ).toBe('idle')
  })

  it('limpia el estado al borrar el texto', () => {
    expect(
      resolveTicketSearchUiStatus({ query: '', loading: false, error: '', resultCount: 4 }),
    ).toBe('idle')
  })

  it('navega resultados en ciclo con teclado', () => {
    expect(moveTicketSearchIndex(-1, 1, 3)).toBe(0)
    expect(moveTicketSearchIndex(0, 1, 3)).toBe(1)
    expect(moveTicketSearchIndex(2, 1, 3)).toBe(0)
    expect(moveTicketSearchIndex(0, -1, 3)).toBe(2)
    expect(moveTicketSearchIndex(0, 1, 0)).toBe(-1)
  })
})
