import { PriorityLevel, TicketStatus } from '../database/entities'
import {
  isOverdueActive,
  isUrgentTicket,
  slaLevelFromDates,
  statusesForPreset,
  urgentTicketScore,
} from './dashboard-rules'

describe('Reglas del panel de mesa de ayuda', () => {
  it('mapea presets a estados', () => {
    expect(statusesForPreset('open')).toEqual([TicketStatus.OPEN, TicketStatus.ASSIGNED])
    expect(statusesForPreset('inProgress')).toEqual([
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_USER,
      TicketStatus.ESCALATED,
    ])
    expect(statusesForPreset('resolved')).toEqual([TicketStatus.RESOLVED])
    expect(statusesForPreset('closed')).toEqual([TicketStatus.CLOSED])
  })

  it('marca vencidos sólo en tickets activos', () => {
    const now = new Date('2026-08-19T12:00:00.000Z')
    const overdueAt = new Date('2026-08-19T11:00:00.000Z')
    expect(isOverdueActive(TicketStatus.OPEN, overdueAt, now)).toBe(true)
    expect(isOverdueActive(TicketStatus.CLOSED, overdueAt, now)).toBe(false)
  })

  it('calcula niveles SLA', () => {
    const created = new Date('2026-08-19T00:00:00.000Z')
    const due = new Date('2026-08-19T10:00:00.000Z')
    expect(slaLevelFromDates(created, due, new Date('2026-08-19T11:00:00.000Z'))).toBe('red')
    expect(slaLevelFromDates(created, due, new Date('2026-08-19T08:00:00.000Z'))).toBe('orange')
    expect(slaLevelFromDates(created, due, new Date('2026-08-19T05:00:00.000Z'))).toBe('yellow')
    expect(slaLevelFromDates(created, due, new Date('2026-08-19T01:00:00.000Z'))).toBe('green')
  })

  it('prioriza tickets urgentes por vencimiento y criticidad', () => {
    const now = new Date('2026-08-19T12:00:00.000Z')
    const overdue = {
      status: TicketStatus.IN_PROGRESS,
      slaCreatedAt: new Date('2026-08-18T00:00:00.000Z'),
      slaDueAt: new Date('2026-08-19T10:00:00.000Z'),
      priorityLevel: PriorityLevel.MEDIUM,
      now,
    }
    const critical = {
      status: TicketStatus.ASSIGNED,
      slaCreatedAt: new Date('2026-08-19T08:00:00.000Z'),
      slaDueAt: new Date('2026-08-19T20:00:00.000Z'),
      priorityLevel: PriorityLevel.CRITICAL,
      now,
    }

    expect(isUrgentTicket(overdue)).toBe(true)
    expect(isUrgentTicket(critical)).toBe(true)
    expect(urgentTicketScore(overdue)).toBeLessThan(urgentTicketScore(critical))
  })
})
