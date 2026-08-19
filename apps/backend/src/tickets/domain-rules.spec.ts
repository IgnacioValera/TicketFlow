import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common'
import { RoleCode, TicketStatus, User } from '../database/entities'
import { assertDateRange, assertSlaHours, validatePasswordPolicy } from '../common/validation'
import {
  assertStatusReason,
  assertTicketMutable,
  assertTransition,
  statusRequiresReason,
  TRANSITIONS,
} from './ticket-rules'

function httpStatus(error: unknown) {
  return (error as { getStatus?: () => number }).getStatus?.()
}

const elevatedUser = {
  role: { code: RoleCode.ADMIN, permissions: [{ code: 'TICKET_STATUS_CHANGE' }] },
} as User

describe('Reglas de dominio', () => {
  it('rechaza SLA con resolución menor que respuesta', () => {
    expect(() => assertSlaHours(8, 4)).toThrow(BadRequestException)
    try {
      assertSlaHours(8, 4)
    } catch (error) {
      expect(httpStatus(error)).toBe(400)
      expect((error as Error).message).toMatch(/resolución/i)
    }
  })

  it('rechaza actualización parcial de SLA que deja resolución menor que respuesta', () => {
    const storedResponse = 4
    const storedResolution = 8
    const nextResponse = 12
    try {
      assertSlaHours(nextResponse, storedResolution)
      throw new Error('debería fallar')
    } catch (error) {
      expect(httpStatus(error)).toBe(400)
    }
    expect(() => assertSlaHours(storedResponse, storedResolution)).not.toThrow()
  })

  it('rechaza rango con fecha inicial posterior a la final', () => {
    try {
      assertDateRange('2026-08-10', '2026-08-01')
      throw new Error('debería fallar')
    } catch (error) {
      expect(httpStatus(error)).toBe(400)
    }
  })

  it('bloquea edición de ticket cerrado con 409', () => {
    try {
      assertTicketMutable({ status: TicketStatus.CLOSED })
      throw new Error('debería fallar')
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException)
      expect(httpStatus(error)).toBe(409)
      expect((error as Error).message).toMatch(/finalizado/i)
    }
  })

  it('bloquea operación sobre ticket cancelado con 409', () => {
    try {
      assertTicketMutable({ status: TicketStatus.CANCELLED })
      throw new Error('debería fallar')
    } catch (error) {
      expect(httpStatus(error)).toBe(409)
    }
  })

  it('exige motivo al resolver', () => {
    expect(statusRequiresReason(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true)
    try {
      assertStatusReason(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, '   ')
      throw new Error('debería fallar')
    } catch (error) {
      expect(httpStatus(error)).toBe(400)
    }
  })

  it('exige motivo al reabrir', () => {
    expect(statusRequiresReason(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(true)
    expect(() => assertStatusReason(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS, 'Reapertura justificada')).not.toThrow()
  })

  it('conserva 422 en transición inválida', () => {
    try {
      assertTransition(TicketStatus.OPEN, TicketStatus.RESOLVED, elevatedUser, false, false)
      throw new Error('debería fallar')
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException)
      expect(httpStatus(error)).toBe(422)
    }
  })

  it('rechaza cancelado sin transiciones disponibles', () => {
    expect(TRANSITIONS[TicketStatus.CANCELLED]).toEqual([])
    try {
      assertTransition(TicketStatus.CANCELLED, TicketStatus.IN_PROGRESS, elevatedUser, false, false)
      throw new Error('debería fallar')
    } catch (error) {
      expect(httpStatus(error)).toBe(422)
    }
  })

  it('permite reapertura CLOSED a IN_PROGRESS', () => {
    expect(TRANSITIONS[TicketStatus.CLOSED]).toContain(TicketStatus.IN_PROGRESS)
    expect(() => assertTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS, elevatedUser, false, true)).not.toThrow()
  })

  it('no permite reabrir un ticket cancelado', () => {
    expect(TRANSITIONS[TicketStatus.CANCELLED]).toEqual([])
  })

  it('valida política de contraseña por bytes UTF-8', () => {
    const tooLong = `${'A'.repeat(70)}ñ1!`
    expect(Buffer.byteLength(tooLong, 'utf8')).toBeGreaterThan(72)
    const result = validatePasswordPolicy(tooLong)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/72 bytes/i)
  })
})
