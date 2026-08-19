import { TicketStatus } from '../database/entities'
import { statusRequiresReason, TRANSITIONS } from './ticket-rules'

describe('Transiciones de tickets', () => {
  it('define el grafo completo de estados', () => {
    expect(TRANSITIONS[TicketStatus.OPEN]).toEqual([TicketStatus.ASSIGNED, TicketStatus.CANCELLED])
    expect(TRANSITIONS[TicketStatus.CANCELLED]).toEqual([])
    expect(TRANSITIONS[TicketStatus.CLOSED]).toEqual([TicketStatus.IN_PROGRESS])
  })

  it('marca motivo obligatorio en resolución y reapertura', () => {
    expect(statusRequiresReason(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true)
    expect(statusRequiresReason(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(true)
    expect(statusRequiresReason(TicketStatus.OPEN, TicketStatus.ASSIGNED)).toBe(false)
  })
})
