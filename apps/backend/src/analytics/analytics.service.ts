import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import { assertDateRange } from '../common/validation'
import { isPortalRole } from '../common/roles'
import {
  IN_PROGRESS_STATUSES,
  OPEN_STATUSES,
  isOverdueActive,
  isSlaWarning,
  isUrgentTicket,
  slaLevelFromDates,
  urgentTicketScore,
} from './dashboard-rules'
import { RoleCode, SatisfactionSurvey, Ticket, TicketStatus, User } from '../database/entities'

export interface DashboardTicketSummary {
  id: string
  folio: string
  title: string
  status: TicketStatus
  priorityName: string
  priorityColor?: string
  assigneeName?: string | null
  slaLevel: 'green' | 'yellow' | 'orange' | 'red'
  createdAt: string
  slaDueAt: string
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(SatisfactionSurvey) private readonly surveys: Repository<SatisfactionSurvey>,
  ) {}

  async dashboard(user: User, requestedScope?: 'GLOBAL' | 'OWN') {
    const own = user.role.code === RoleCode.AGENT || requestedScope === 'OWN'
    const qb = this.scoped(user, own)
    const rows = await qb
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        `COUNT(*) FILTER (WHERE ticket.sla_due_at < NOW() AND ticket.status NOT IN ('CLOSED','CANCELLED'))`,
        'overdue',
      )
      .groupBy('ticket.status')
      .getRawMany<{ status: TicketStatus; count: string; overdue: string }>()
    const count = (statuses: TicketStatus[]) =>
      rows.filter((row) => statuses.includes(row.status)).reduce((sum, row) => sum + Number(row.count), 0)
    const overdue = rows.reduce((sum, row) => sum + Number(row.overdue), 0)
    const trendRows = await this.scoped(user, own)
      .select("TO_CHAR(DATE(ticket.created_at), 'DD/MM')", 'period')
      .addSelect(`COUNT(*) FILTER (WHERE ticket.status IN ('OPEN','ASSIGNED'))`, 'open')
      .addSelect(`COUNT(*) FILTER (WHERE ticket.status = 'IN_PROGRESS')`, 'inProgress')
      .addSelect(`COUNT(*) FILTER (WHERE ticket.status IN ('RESOLVED','CLOSED'))`, 'resolved')
      .where("ticket.created_at >= NOW() - INTERVAL '6 days'")
      .groupBy('DATE(ticket.created_at)')
      .orderBy('DATE(ticket.created_at)', 'ASC')
      .getRawMany<{ period: string; open: string; inProgress: string; resolved: string }>()
    const kpis = [
      { key: 'open' as const, label: 'Abiertos', value: count(OPEN_STATUSES) },
      { key: 'overdue' as const, label: 'Vencidos', value: overdue },
      { key: 'inProgress' as const, label: 'En proceso', value: count(IN_PROGRESS_STATUSES) },
      { key: 'resolved' as const, label: 'Resueltos', value: count([TicketStatus.RESOLVED]) },
      { key: 'closed' as const, label: 'Cerrados', value: count([TicketStatus.CLOSED]) },
    ]

    const listQb = this.scoped(user, own)
      .leftJoinAndSelect('ticket.category', 'category')
      .leftJoinAndSelect('ticket.priority', 'priority')
      .leftJoinAndSelect('ticket.assignee', 'assignee')

    const recentTickets = (await listQb.clone().orderBy('ticket.createdAt', 'DESC').take(5).getMany()).map((ticket) =>
      this.serializeDashboardTicket(ticket),
    )

    const urgentCandidates = await listQb.clone().andWhere('ticket.status NOT IN (:...terminal)', {
      terminal: [TicketStatus.CLOSED, TicketStatus.CANCELLED],
    }).getMany()

    const urgentTickets = urgentCandidates
      .filter((ticket) =>
        isUrgentTicket({
          status: ticket.status,
          slaCreatedAt: ticket.slaCreatedAt,
          slaDueAt: ticket.slaDueAt,
          priorityLevel: ticket.priority.level,
        }),
      )
      .sort(
        (left, right) =>
          urgentTicketScore({
            status: left.status,
            slaCreatedAt: left.slaCreatedAt,
            slaDueAt: left.slaDueAt,
            priorityLevel: left.priority.level,
          }) -
          urgentTicketScore({
            status: right.status,
            slaCreatedAt: right.slaCreatedAt,
            slaDueAt: right.slaDueAt,
            priorityLevel: right.priority.level,
          }),
      )
      .slice(0, 5)
      .map((ticket) => this.serializeDashboardTicket(ticket))

    const now = new Date()
    const slaAlerts = {
      overdueCount: urgentCandidates.filter((ticket) => isOverdueActive(ticket.status, ticket.slaDueAt, now)).length,
      warningCount: urgentCandidates.filter((ticket) =>
        isSlaWarning(ticket.status, ticket.slaCreatedAt, ticket.slaDueAt, now),
      ).length,
    }

    return {
      scope: own ? ('OWN' as const) : ('GLOBAL' as const),
      kpis,
      trend: trendRows.map((row) => ({
        period: row.period,
        open: Number(row.open),
        inProgress: Number(row.inProgress),
        resolved: Number(row.resolved),
      })),
      distribution: kpis.map((kpi) => ({ name: kpi.label, value: kpi.value })),
      recentTickets,
      urgentTickets,
      slaAlerts,
    }
  }

  private serializeDashboardTicket(ticket: Ticket): DashboardTicketSummary {
    return {
      id: ticket.id,
      folio: ticket.folio,
      title: ticket.title,
      status: ticket.status,
      priorityName: ticket.priority.name,
      priorityColor: ticket.priority.color,
      assigneeName: ticket.assignee?.fullName ?? null,
      slaLevel: slaLevelFromDates(ticket.slaCreatedAt, ticket.slaDueAt),
      createdAt: ticket.createdAt.toISOString(),
      slaDueAt: ticket.slaDueAt.toISOString(),
    }
  }

  async byStatus(user: User, startDate?: string, endDate?: string) {
    const rows = await this.createdRange(user, startDate, endDate)
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.status')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ status: string; count: string }>()
    const total = rows.reduce((sum, row) => sum + Number(row.count), 0)
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
      percentage: total ? Math.round((Number(row.count) / total) * 1000) / 10 : 0,
    }))
  }

  async byAgent(user: User, startDate?: string, endDate?: string) {
    const rows = await this.createdRange(user, startDate, endDate)
      .leftJoin('ticket.assignee', 'agent')
      .select('agent.id', 'agentId')
      .addSelect('agent.full_name', 'agentName')
      .addSelect(`COUNT(*) FILTER (WHERE ticket.status IN ('OPEN','ASSIGNED'))`, 'open')
      .addSelect(`COUNT(*) FILTER (WHERE ticket.status = 'IN_PROGRESS')`, 'inProgress')
      .addSelect(`COUNT(*) FILTER (WHERE ticket.status IN ('RESOLVED','CLOSED'))`, 'resolved')
      .addSelect(
        `COUNT(*) FILTER (WHERE ticket.sla_due_at < NOW() AND ticket.status NOT IN ('CLOSED','CANCELLED'))`,
        'overdue',
      )
      .addSelect('COUNT(*)', 'total')
      .andWhere('ticket.assignee_id IS NOT NULL')
      .groupBy('agent.id')
      .addGroupBy('agent.full_name')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<Record<string, string>>()
    return rows.map((r) => ({
      agentId: r.agentId,
      agentName: r.agentName,
      open: Number(r.open),
      inProgress: Number(r.inProgress),
      resolved: Number(r.resolved),
      overdue: Number(r.overdue),
      total: Number(r.total),
    }))
  }

  async byCategory(user: User, startDate?: string, endDate?: string) {
    const rows = await this.createdRange(user, startDate, endDate)
      .leftJoin('ticket.category', 'category')
      .leftJoin('ticket.priority', 'priority')
      .select('category.name', 'category')
      .addSelect('priority.name', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('category.name')
      .addGroupBy('priority.name')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<Record<string, string>>()
    return rows.map((r) => ({ category: r.category, priority: r.priority, count: Number(r.count) }))
  }

  async slaCompliance(user: User, startDate?: string, endDate?: string) {
    assertDateRange(startDate, endDate)
    const qb = this.scoped(user).andWhere(`ticket.status IN ('RESOLVED','CLOSED')`)
    if (startDate) qb.andWhere('ticket.closed_at >= :startDate', { startDate })
    if (endDate) qb.andWhere("ticket.closed_at < (:endDate::date + INTERVAL '1 day')", { endDate })
    const row = await qb
      .select(`COUNT(*) FILTER (WHERE ticket.closed_at <= ticket.sla_due_at)`, 'withinSla')
      .addSelect(`COUNT(*) FILTER (WHERE ticket.closed_at > ticket.sla_due_at)`, 'outOfSla')
      .getRawOne<{ withinSla: string; outOfSla: string }>()
    const withinSla = Number(row?.withinSla ?? 0)
    const outOfSla = Number(row?.outOfSla ?? 0)
    const total = withinSla + outOfSla
    return {
      periodLabel: startDate || endDate ? `${startDate ?? 'inicio'} - ${endDate ?? 'hoy'}` : 'Histórico',
      withinSla,
      outOfSla,
      withinPercentage: total ? Math.round((withinSla / total) * 1000) / 10 : 0,
      outPercentage: total ? Math.round((outOfSla / total) * 1000) / 10 : 0,
    }
  }

  async byCompany(user: User, startDate?: string, endDate?: string) {
    const rows = await this.createdRange(user, startDate, endDate)
      .leftJoin('ticket.client', 'client')
      .select('client.name', 'company')
      .addSelect('client.industry', 'industry')
      .addSelect('client.region', 'region')
      .addSelect('COUNT(*)', 'tickets')
      .andWhere('ticket.client_id IS NOT NULL')
      .groupBy('client.id')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<Record<string, string>>()
    return rows.map((r) => ({
      company: r.company,
      industry: r.industry,
      region: r.region,
      tickets: Number(r.tickets),
    }))
  }

  async satisfaction(user: User, startDate?: string, endDate?: string) {
    assertDateRange(startDate, endDate)
    const qb = this.surveys.createQueryBuilder('survey').innerJoin('survey.ticket', 'ticket')
    this.applyTicketScope(qb, user)
    if (startDate) qb.andWhere('survey.submitted_at >= :startDate', { startDate })
    if (endDate) qb.andWhere("survey.submitted_at < (:endDate::date + INTERVAL '1 day')", { endDate })
    const rows = await qb
      .select('survey.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .groupBy('survey.rating')
      .orderBy('survey.rating', 'ASC')
      .getRawMany<{ rating: string; count: string }>()
    const byRating = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: Number(rows.find((row) => Number(row.rating) === rating)?.count ?? 0),
    }))
    const totalResponses = byRating.reduce((sum, item) => sum + item.count, 0)
    const ratingSum = byRating.reduce((sum, item) => sum + item.rating * item.count, 0)
    return {
      averageRating: totalResponses ? Math.round((ratingSum / totalResponses) * 10) / 10 : 0,
      totalResponses,
      byRating,
    }
  }

  private createdRange(user: User, startDate?: string, endDate?: string) {
    assertDateRange(startDate, endDate)
    const qb = this.scoped(user)
    if (startDate) qb.andWhere('ticket.created_at >= :startDate', { startDate })
    if (endDate) qb.andWhere("ticket.created_at < (:endDate::date + INTERVAL '1 day')", { endDate })
    return qb
  }

  private applyTicketScope(
    qb: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown },
    user: User,
    forceOwn = false,
  ) {
    if (user.role.code === RoleCode.AGENT || forceOwn) {
      qb.andWhere('ticket.assignee_id = :userId', { userId: user.id })
    } else if (isPortalRole(user.role.code)) {
      qb.andWhere('ticket.requester_id = :userId', { userId: user.id })
    }
  }

  private scoped(user: User, forceOwn = false): SelectQueryBuilder<Ticket> {
    const qb = this.tickets.createQueryBuilder('ticket')
    this.applyTicketScope(qb, user, forceOwn)
    return qb
  }
}
