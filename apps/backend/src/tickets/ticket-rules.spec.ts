import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common'
import { RoleCode, TicketStatus } from '../database/entities'
import { assertTicketSurvey, calculateSla, TRANSITIONS } from './ticket-rules'

describe('Reglas de tickets', () => {
  it('impide saltar directamente de OPEN a RESOLVED', () => { expect(TRANSITIONS[TicketStatus.OPEN]).not.toContain(TicketStatus.RESOLVED) })
  it('calcula SLA vencido', () => { const sla = calculateSla(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T08:00:00Z'), 8, new Date('2026-01-01T09:00:00Z')); expect(sla.level).toBe('red'); expect(sla.percentRemaining).toBe(0) })
  it('calcula SLA próximo a vencer', () => { const sla = calculateSla(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T10:00:00Z'), 10, new Date('2026-01-01T08:30:00Z')); expect(sla.level).toBe('orange') })
  it('conserva los roles documentados', () => { expect(Object.values(RoleCode)).toEqual(['ADMIN', 'SALES', 'SUPERVISOR', 'AGENT', 'CLIENT', 'REQUESTER']) })

  it('sólo el solicitante con permiso responde la encuesta de un ticket cerrado', () => {
    const requester = { id: 'u1', role: { permissions: [{ code: 'SURVEY_RESPOND' }] } } as never
    const agent = { id: 'u2', role: { permissions: [] } } as never
    const closed = { status: TicketStatus.CLOSED, requester: { id: 'u1' } }
    expect(() => assertTicketSurvey(closed, requester)).not.toThrow()
    expect(() => assertTicketSurvey(closed, agent)).toThrow(ForbiddenException)
    expect(() => assertTicketSurvey({ status: TicketStatus.OPEN, requester: { id: 'u1' } }, requester)).toThrow(UnprocessableEntityException)
  })
})
