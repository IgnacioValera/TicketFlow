import { describe, expect, it } from 'vitest'
import { LIMITS } from '@/constants/validation'
import type { TicketFormValues } from '@/utils/ticket-form'
import { validateTicketForm } from '@/utils/ticket-form'

describe('ticket-form', () => {
  const valid: TicketFormValues = {
    title: 'Incidente de red',
    description: 'Descripción válida con suficiente detalle.',
    categoryId: '1',
    priorityId: '2',
  }

  it('rechaza título con solo espacios', () => {
    expect(validateTicketForm({ ...valid, title: '    ' })).toMatch(/título/i)
  })

  it('rechaza título demasiado corto', () => {
    expect(validateTicketForm({ ...valid, title: 'abc' })).toMatch(/al menos 4/i)
  })

  it('rechaza descripción demasiado corta', () => {
    expect(validateTicketForm({ ...valid, description: 'corta' })).toMatch(/al menos 10/i)
  })

  it('acepta caracteres especiales en título y descripción', () => {
    expect(
      validateTicketForm({
        ...valid,
        title: 'Error #42 — VPN (áéí)',
        description: 'Detalle con símbolos: @#$% y acentos ñ.',
      }),
    ).toBeNull()
  })

  it('exige categoría y prioridad', () => {
    expect(validateTicketForm({ ...valid, categoryId: '' })).toMatch(/categoría/i)
    expect(validateTicketForm({ ...valid, priorityId: '' })).toMatch(/prioridad/i)
  })

  it('respeta límites máximos', () => {
    expect(validateTicketForm({ ...valid, title: 'A'.repeat(LIMITS.TICKET_TITLE + 1) })).toMatch(/200/)
  })
})
