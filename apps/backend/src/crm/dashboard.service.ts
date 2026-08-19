import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  ActivityStatus,
  Client,
  ClientStatus,
  CrmActivity,
  CrmContact,
  CrmOpportunity,
  CrmSurveyResponse,
  OpportunityStage,
  User,
} from '../database/entities'
import { applyClientScope } from './access'
import { CLOSED_OPPORTUNITY_STAGES, conversionRate, mapPipeline } from './dashboard-metrics'
import { calculateNps } from './nps'

@Injectable()
export class CrmDashboardService {
  constructor(
    @InjectRepository(CrmOpportunity) private readonly opportunities: Repository<CrmOpportunity>,
    @InjectRepository(CrmActivity) private readonly activities: Repository<CrmActivity>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(CrmContact) private readonly contacts: Repository<CrmContact>,
    @InjectRepository(CrmSurveyResponse) private readonly responses: Repository<CrmSurveyResponse>,
  ) {}

  async get(user: User) {
    const oppBase = () =>
      applyClientScope(
        this.opportunities.createQueryBuilder('opportunity').leftJoin('opportunity.client', 'client'),
        user,
      )

    const pipelineRows = await oppBase()
      .select('opportunity.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(opportunity.amount), 0)', 'amount')
      .groupBy('opportunity.stage')
      .getRawMany<{ stage: OpportunityStage; count: string; amount: string }>()
    const pipeline = mapPipeline(pipelineRows)
    const won = pipeline.find((item) => item.stage === OpportunityStage.WON)?.count ?? 0
    const lost = pipeline.find((item) => item.stage === OpportunityStage.LOST)?.count ?? 0

    const activitiesBase = () =>
      applyClientScope(
        this.activities.createQueryBuilder('activity').leftJoin('activity.client', 'client'),
        user,
      )
    const pendingActivities = await activitiesBase()
      .andWhere('activity.status = :status', { status: ActivityStatus.PENDING })
      .getCount()
    const activitiesDue = await activitiesBase()
      .andWhere('activity.status = :status', { status: ActivityStatus.PENDING })
      .andWhere('activity.due_at IS NOT NULL')
      .andWhere("activity.due_at <= NOW() + INTERVAL '7 days'")
      .getCount()

    const clientBase = () => applyClientScope(this.clients.createQueryBuilder('client'), user)
    const activeClients = await clientBase()
      .andWhere('client.status = :active', { active: ClientStatus.ACTIVE })
      .getCount()
    const topClients = await clientBase().orderBy('client.score', 'DESC').take(5).getMany()

    const contacts = await applyClientScope(
      this.contacts.createQueryBuilder('contact').leftJoin('contact.client', 'client'),
      user,
    ).getCount()

    const openOpportunities = await oppBase()
      .andWhere('opportunity.stage NOT IN (:...closed)', { closed: CLOSED_OPPORTUNITY_STAGES })
      .getCount()
    const openPipelineRow = await oppBase()
      .select('COALESCE(SUM(opportunity.amount), 0)', 'amount')
      .andWhere('opportunity.stage NOT IN (:...closed)', { closed: CLOSED_OPPORTUNITY_STAGES })
      .getRawOne<{ amount: string }>()

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const wonThisMonth = await oppBase()
      .andWhere('opportunity.stage = :won', { won: OpportunityStage.WON })
      .andWhere('opportunity.updated_at >= :monthStart', { monthStart })
      .getCount()
    const wonAmountRow = await oppBase()
      .select('COALESCE(SUM(opportunity.amount), 0)', 'amount')
      .andWhere('opportunity.stage = :won', { won: OpportunityStage.WON })
      .andWhere('opportunity.updated_at >= :monthStart', { monthStart })
      .getRawOne<{ amount: string }>()
    const lostThisMonth = await oppBase()
      .andWhere('opportunity.stage = :lost', { lost: OpportunityStage.LOST })
      .andWhere('opportunity.updated_at >= :monthStart', { monthStart })
      .getCount()

    const npsRows = await applyClientScope(
      this.responses
        .createQueryBuilder('response')
        .innerJoin('response.invitation', 'invitation')
        .innerJoin('invitation.client', 'client')
        .where('response.nps_score IS NOT NULL'),
      user,
    ).getMany()

    return {
      pipeline,
      conversionRate: conversionRate(won, lost),
      nps: calculateNps(npsRows.map((row) => row.npsScore).filter((score): score is number => score != null)),
      activitiesDue,
      pendingActivities,
      wonThisMonth,
      wonAmountThisMonth: Number(wonAmountRow?.amount ?? 0),
      lostThisMonth,
      activeClients,
      contacts,
      openOpportunities,
      openPipelineAmount: Number(openPipelineRow?.amount ?? 0),
      topClients: topClients.map((client) => ({
        id: client.id,
        name: client.name,
        score: client.score,
        segment: client.segment,
      })),
    }
  }
}
