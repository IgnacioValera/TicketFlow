import { LIMITS } from '@/constants/validation'
import type { CrmOpportunity, OpportunityStage } from '@/types/crm.types'
import { PROBABILITY_BY_STAGE } from '@/types/crm.types'
import { maxLengthAfterTrim, requiredTrimmed } from '@/utils/validation'

export const OPEN_STAGES: OpportunityStage[] = ['NEW', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION']
export const ALL_STAGES: OpportunityStage[] = [...OPEN_STAGES, 'WON', 'LOST']

export type OpportunityStatusFilter = 'OPEN' | 'WON' | 'LOST'

export type OpportunityFormValues = {
  clientId: string
  contactId: string
  ownerId: string
  title: string
  amount: string
  stage: OpportunityStage
  probability: string
  expectedCloseDate: string
  notes: string
}

export type OpportunityFormErrors = Partial<Record<keyof OpportunityFormValues | 'lostReason' | 'reopenReason', string>>

export const EMPTY_OPPORTUNITY_FORM: OpportunityFormValues = {
  clientId: '',
  contactId: '',
  ownerId: '',
  title: '',
  amount: '0',
  stage: 'NEW',
  probability: String(PROBABILITY_BY_STAGE.NEW),
  expectedCloseDate: '',
  notes: '',
}

export function opportunityStatus(stage: OpportunityStage): OpportunityStatusFilter {
  if (stage === 'WON') return 'WON'
  if (stage === 'LOST') return 'LOST'
  return 'OPEN'
}

export function stagesForStatus(status?: string) {
  if (status === 'WON') return ['WON'] as OpportunityStage[]
  if (status === 'LOST') return ['LOST'] as OpportunityStage[]
  if (status === 'OPEN') return OPEN_STAGES
  return null
}

export function summarizeOpportunities(items: Array<Pick<CrmOpportunity, 'amount' | 'stage' | 'probability'>>) {
  return {
    count: items.length,
    amount: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    weighted: items
      .filter((item) => item.stage !== 'LOST')
      .reduce((sum, item) => sum + Number(item.amount || 0) * (Number(item.probability || 0) / 100), 0),
  }
}

export function parseAmountInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return Number.NaN
  return Number(digits)
}

export function formatAmountInput(value: string | number) {
  const digits = typeof value === 'number' ? String(Math.trunc(Math.abs(value))) : value.replace(/[^\d]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

export function formFromOpportunity(item: CrmOpportunity): OpportunityFormValues {
  return {
    clientId: item.clientId,
    contactId: item.contactId ?? '',
    ownerId: item.ownerId ?? '',
    title: item.title,
    amount: formatAmountInput(item.amount),
    stage: item.stage,
    probability: String(item.probability),
    expectedCloseDate: item.expectedCloseDate?.slice(0, 10) ?? '',
    notes: item.notes ?? '',
  }
}

export function validateOpportunityForm(form: OpportunityFormValues): OpportunityFormErrors {
  const errors: OpportunityFormErrors = {}
  const titleError =
    requiredTrimmed(form.title, 'El nombre') || maxLengthAfterTrim(form.title, 'El nombre', LIMITS.OPPORTUNITY_TITLE)
  if (titleError) errors.title = titleError
  if (!form.clientId) errors.clientId = 'El cliente es obligatorio'
  const amount = parseAmountInput(form.amount)
  if (!form.amount.trim() || Number.isNaN(amount)) errors.amount = 'El importe es obligatorio'
  else if (amount < 0) errors.amount = 'El importe no puede ser negativo'
  const probability = Number(form.probability)
  if (form.probability.trim() === '' || Number.isNaN(probability)) errors.probability = 'La probabilidad es obligatoria'
  else if (!Number.isInteger(probability) || probability < 0 || probability > 100) {
    errors.probability = 'La probabilidad debe ser un entero entre 0 y 100'
  }
  if (form.notes.trim().length > LIMITS.NOTES) errors.notes = `La descripción no puede superar ${LIMITS.NOTES} caracteres`
  return errors
}

export function validateLostReason(value: string) {
  return (
    requiredTrimmed(value, 'El motivo de pérdida') ||
    maxLengthAfterTrim(value, 'El motivo de pérdida', LIMITS.LOST_REASON)
  )
}

export function validateReopenReason(value: string) {
  return (
    requiredTrimmed(value, 'El motivo de reapertura') ||
    maxLengthAfterTrim(value, 'El motivo de reapertura', LIMITS.LOST_REASON)
  )
}

export function mapOpportunityApiError(message: unknown): OpportunityFormErrors {
  const text = Array.isArray(message) ? message.join(' ') : String(message ?? '')
  const errors: OpportunityFormErrors = {}
  if (/título|nombre/i.test(text)) errors.title = text
  if (/cliente/i.test(text)) errors.clientId = text
  if (/contacto/i.test(text)) errors.contactId = text
  if (/importe|monto|amount/i.test(text)) errors.amount = text
  if (/probabilidad/i.test(text)) errors.probability = text
  if (/pérdida|perdida|lost/i.test(text)) errors.lostReason = text
  if (/reapertura/i.test(text)) errors.reopenReason = text
  return errors
}

export function buildOpportunityPayload(form: OpportunityFormValues) {
  return {
    clientId: form.clientId,
    contactId: form.contactId || undefined,
    ownerId: form.ownerId || undefined,
    title: form.title.trim(),
    amount: parseAmountInput(form.amount),
    stage: form.stage,
    probability: Number(form.probability),
    expectedCloseDate: form.expectedCloseDate || undefined,
    notes: form.notes.trim() || undefined,
  }
}
