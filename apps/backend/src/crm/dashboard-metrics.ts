import { OpportunityStage } from '../database/entities'

export const CLOSED_OPPORTUNITY_STAGES = [OpportunityStage.WON, OpportunityStage.LOST]

export function conversionRate(won: number, lost: number) {
  const closed = won + lost
  return closed ? Math.round((won / closed) * 1000) / 10 : 0
}

export function mapPipeline(
  rows: Array<{ stage: OpportunityStage; count: string | number; amount: string | number }>,
) {
  return Object.values(OpportunityStage).map((stage) => {
    const row = rows.find((item) => item.stage === stage)
    return { stage, count: Number(row?.count ?? 0), amount: Number(row?.amount ?? 0) }
  })
}
