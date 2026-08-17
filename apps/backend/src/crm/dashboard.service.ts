import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ActivityStatus, Client, CrmActivity, CrmOpportunity, CrmSurveyResponse, OpportunityStage, User } from '../database/entities'
import { applyClientScope } from './access'
import { calculateNps } from './nps'

@Injectable()
export class CrmDashboardService {
  constructor(
    @InjectRepository(CrmOpportunity) private readonly opportunities: Repository<CrmOpportunity>,
    @InjectRepository(CrmActivity) private readonly activities: Repository<CrmActivity>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(CrmSurveyResponse) private readonly responses: Repository<CrmSurveyResponse>,
  ) {}

  async get(user: User) {
    const oppQb = applyClientScope(this.opportunities.createQueryBuilder('opportunity').leftJoin('opportunity.client', 'client'), user)
    const pipelineRows = await oppQb.clone()
      .select('opportunity.stage', 'stage').addSelect('COUNT(*)', 'count').addSelect('COALESCE(SUM(opportunity.amount), 0)', 'amount')
      .groupBy('opportunity.stage').getRawMany<{ stage: OpportunityStage; count: string; amount: string }>()
    const pipeline = Object.values(OpportunityStage).map((stage) => {
      const row = pipelineRows.find((item) => item.stage === stage)
      return { stage, count: Number(row?.count ?? 0), amount: Number(row?.amount ?? 0) }
    })
    const won = pipeline.find((item) => item.stage === OpportunityStage.WON)?.count ?? 0
    const lost = pipeline.find((item) => item.stage === OpportunityStage.LOST)?.count ?? 0
    const closed = won + lost
    const activitiesQb = applyClientScope(this.activities.createQueryBuilder('activity').leftJoin('activity.client', 'client'), user)
    const due = await activitiesQb.clone().andWhere('activity.status = :status', { status: ActivityStatus.PENDING }).andWhere('activity.due_at IS NOT NULL').andWhere('activity.due_at <= NOW() + INTERVAL \'7 days\'').getCount()
    const clientQb = applyClientScope(this.clients.createQueryBuilder('client'), user)
    const topClients = await clientQb.orderBy('client.score', 'DESC').take(5).getMany()
    const npsRows = await this.responses.createQueryBuilder('response').where('response.nps_score IS NOT NULL').getMany()
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const wonThisMonth = await applyClientScope(this.opportunities.createQueryBuilder('opportunity').leftJoin('opportunity.client', 'client'), user)
      .andWhere('opportunity.stage = :won', { won: OpportunityStage.WON })
      .andWhere('opportunity.updated_at >= :monthStart', { monthStart })
      .getCount()
    return {
      pipeline,
      conversionRate: closed ? Math.round((won / closed) * 1000) / 10 : 0,
      nps: calculateNps(npsRows.map((row) => row.npsScore!).filter((score) => score !== null && score !== undefined)),
      activitiesDue: due,
      wonThisMonth,
      topClients: topClients.map((client) => ({ id: client.id, name: client.name, score: client.score, segment: client.segment })),
    }
  }
}
