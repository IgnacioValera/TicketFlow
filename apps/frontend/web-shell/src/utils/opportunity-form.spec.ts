import { describe, expect, it } from 'vitest'
import {
  buildOpportunityPayload,
  formatAmountInput,
  parseAmountInput,
  summarizeOpportunities,
  validateLostReason,
  validateOpportunityForm,
  type OpportunityFormValues,
} from '@/utils/opportunity-form'

const valid: OpportunityFormValues = {
  clientId: 'c1',
  contactId: 'ct1',
  ownerId: '1',
  title: 'Renovación anual',
  amount: '50000',
  stage: 'PROPOSAL',
  probability: '50',
  expectedCloseDate: '2026-09-01',
  notes: 'Seguimiento',
}

describe('Formulario de oportunidades', () => {
  it('rechaza nombre, cliente e importe inválidos', () => {
    const errors = validateOpportunityForm({ ...valid, title: '   ', clientId: '', amount: '' })
    expect(errors.title).toMatch(/obligatorio/i)
    expect(errors.clientId).toMatch(/cliente/i)
    expect(errors.amount).toMatch(/obligatorio/i)
  })

  it('exige motivo de pérdida', () => {
    expect(validateLostReason('   ')).toMatch(/obligatorio/i)
  })

  it('formatea el importe con comas y lo envía como número', () => {
    expect(formatAmountInput(10000000)).toBe('10,000,000')
    expect(parseAmountInput('10,000,000')).toBe(10000000)
    expect(buildOpportunityPayload({ ...valid, amount: '50,000' }).amount).toBe(50000)
  })

  it('no incluye en el ponderado las oportunidades perdidas', () => {
    expect(
      summarizeOpportunities([
        { amount: 100, stage: 'PROPOSAL', probability: 50 },
        { amount: 80, stage: 'LOST', probability: 0 },
      ]),
    ).toEqual({ count: 2, amount: 180, weighted: 50 })
  })
})
