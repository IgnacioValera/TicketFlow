import { describe, expect, it } from 'vitest'
import { calculateClientScore } from '@/utils/crm-score'
import { calculateNps } from '@/utils/nps'
import { PROBABILITY_BY_STAGE } from '@/types/crm.types'
import { requiredTrimmed } from '@/utils/validation'

describe('NPS', () => {
  it('calcula NPS como promotores menos detractores', () => {
    expect(calculateNps([10, 9, 8, 6])).toEqual({ nps: 25, promoters: 2, passives: 1, detractors: 1, total: 4 })
  })
})

describe('Score CRM', () => {
  it('usa 50 sin datos', () => {
    expect(calculateClientScore({
      ticketRatings: [], crmNpsScores: [], wonCount: 0, lostCount: 0, completedActivities90d: 0,
      totalActivities: 0, closedTickets: 0, totalTickets: 0, ageDays: 0,
    })).toBe(50)
  })
})

describe('Probabilidad por etapa', () => {
  it('asigna 100 a WON y 0 a LOST', () => {
    expect(PROBABILITY_BY_STAGE.WON).toBe(100)
    expect(PROBABILITY_BY_STAGE.LOST).toBe(0)
    expect(PROBABILITY_BY_STAGE.PROPOSAL).toBe(50)
  })
})

describe('Validaciones CRM', () => {
  it('rechaza motivo de pérdida vacío', () => {
    expect(requiredTrimmed('   ', 'El motivo de pérdida')).toMatch(/obligatorio/i)
  })
})
