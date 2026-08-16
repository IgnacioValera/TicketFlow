import { BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { OpportunityStage } from '../database/entities'

export const TERMINAL_STAGES = [OpportunityStage.WON, OpportunityStage.LOST] as const

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
