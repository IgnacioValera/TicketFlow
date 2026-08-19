import { BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { OpportunityStage } from '../database/entities'

export const TERMINAL_STAGES = [OpportunityStage.WON, OpportunityStage.LOST] as const

export const OPEN_STAGES = [
  OpportunityStage.NEW,
  OpportunityStage.QUALIFICATION,
  OpportunityStage.PROPOSAL,
  OpportunityStage.NEGOTIATION,
] as const

export const OPPORTUNITY_STATUS_FILTERS = ['OPEN', 'WON', 'LOST'] as const
export type OpportunityStatusFilter = (typeof OPPORTUNITY_STATUS_FILTERS)[number]

export const PROBABILITY_BY_STAGE: Record<OpportunityStage, number> = {
  [OpportunityStage.NEW]: 10,
  [OpportunityStage.QUALIFICATION]: 25,
  [OpportunityStage.PROPOSAL]: 50,
  [OpportunityStage.NEGOTIATION]: 75,
  [OpportunityStage.WON]: 100,
  [OpportunityStage.LOST]: 0,
}

export function isTerminalStage(stage: OpportunityStage) {
  return stage === OpportunityStage.WON || stage === OpportunityStage.LOST
}

export function isOpenStage(stage: OpportunityStage) {
  return !isTerminalStage(stage)
}

export function stagesForStatus(status?: string | null) {
  if (status === 'WON') return [OpportunityStage.WON]
  if (status === 'LOST') return [OpportunityStage.LOST]
  if (status === 'OPEN') return [...OPEN_STAGES]
  return null
}

export function opportunityStatus(stage: OpportunityStage): OpportunityStatusFilter {
  if (stage === OpportunityStage.WON) return 'WON'
  if (stage === OpportunityStage.LOST) return 'LOST'
  return 'OPEN'
}

export function todayIsoDate(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isPastDate(value: string, today = todayIsoDate()) {
  const day = value.trim().slice(0, 10)
  return Boolean(day) && day < today
}

export const PAST_CLOSE_DATE_MESSAGE = 'La fecha estimada de cierre no puede ser anterior a hoy'

export function summarizeOpportunities(
  items: Array<{ amount: number; stage: OpportunityStage; probability: number }>,
) {
  return {
    count: items.length,
    amount: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    weighted: items
      .filter((item) => item.stage !== OpportunityStage.LOST)
      .reduce((sum, item) => sum + Number(item.amount || 0) * (Number(item.probability || 0) / 100), 0),
  }
}

export function assertStageChange(
  from: OpportunityStage,
  to: OpportunityStage,
  options: { lostReason?: string; reopen?: boolean; reopenReason?: string },
) {
  if (from === to) throw new UnprocessableEntityException('La oportunidad ya está en esa etapa')
  if (isTerminalStage(from)) {
    if (!options.reopen) throw new UnprocessableEntityException('Una oportunidad ganada o perdida sólo se reabre con una acción explícita')
    const reason = options.reopenReason?.trim() ?? ''
    if (!reason) throw new BadRequestException('El motivo de reapertura es obligatorio')
    if (isTerminalStage(to)) throw new UnprocessableEntityException('Reabre la oportunidad a una etapa abierta')
  }
  if (to === OpportunityStage.LOST) {
    const lost = options.lostReason?.trim() ?? ''
    if (!lost) throw new BadRequestException('El motivo de pérdida es obligatorio')
  }
}

export function probabilityForStage(stage: OpportunityStage, explicit?: number) {
  if (stage === OpportunityStage.WON) return 100
  if (stage === OpportunityStage.LOST) return 0
  if (explicit === undefined) return PROBABILITY_BY_STAGE[stage]
  return Math.max(0, Math.min(100, Math.round(explicit)))
}
