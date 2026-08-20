import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { isUniqueViolation } from '../../crm/db-errors'
import { HistoryActorType, RoleCode, Ticket, TicketHistory, TicketStatus, User, UserStatus } from '../../database/entities'
import { NotificationType } from '../../notifications/notification-rules'
import { NotificationsService } from '../../notifications/notifications.service'
import { N8nAssignTicketDto, N8nAssignmentFailedDto } from './dto'
import {
  ACTIVE_WORKLOAD_STATUSES,
  AI_SYSTEM_ACTOR_NAME,
  N8N_SOURCE,
  N8N_WEBHOOK_SECRET_HEADER,
  N8N_WEBHOOK_TIMEOUT_MS,
  applyWorkloadStatus,
  assignmentContextState,
  emptyWorkload,
  type AgentWorkload,
} from './n8n-assignment-rules'

@Injectable()
export class N8nIntegrationService {
  private readonly logger = new Logger(N8nIntegrationService.name)

  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async notifyTicketCreated(ticketId: string) {
    const url = this.config.get<string>('N8N_TICKET_CREATED_WEBHOOK_URL')?.trim()
    if (!url) {
      this.logger.warn('N8N_TICKET_CREATED_WEBHOOK_URL no está configurada; se omite el webhook de ticket creado.')
      return
    }
    const secret = this.config.get<string>('N8N_WEBHOOK_SECRET') ?? ''
    const body = {
      eventType: 'TICKET_CREATED',
      eventId: randomUUID(),
      ticketId,
      occurredAt: new Date().toISOString(),
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), N8N_WEBHOOK_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [N8N_WEBHOOK_SECRET_HEADER]: secret,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`n8n respondió ${response.status}`)
      }
    } finally {
      clearTimeout(timer)
    }
  }

  async assignmentContext(ticketId: string) {
    const ticket = await this.tickets.findOne({
      where: { id: ticketId },
      relations: { category: true, priority: true, client: true, assignee: true, requester: true },
    })
    if (!ticket) throw new NotFoundException('Ticket no encontrado')
    const state = assignmentContextState({ assigneeId: ticket.assignee?.id ?? null, status: ticket.status })
    if (!state.processable) {
      return {
        processable: false,
        reason: state.reason,
        ticket: { id: ticket.id },
        agents: [],
      }
    }
    const agents = await this.loadActiveAgentsWithWorkload()
    return {
      processable: true,
      reason: null,
      ticket: {
        id: ticket.id,
        folio: ticket.folio,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        category: { id: ticket.category.id, name: ticket.category.name },
        priority: { id: ticket.priority.id, name: ticket.priority.name, level: ticket.priority.level },
        company: ticket.client ? { id: ticket.client.id, name: ticket.client.name } : null,
        createdAt: ticket.createdAt.toISOString(),
        slaDueAt: ticket.slaDueAt.toISOString(),
      },
      agents,
    }
  }

  async assignByAi(ticketId: string, dto: N8nAssignTicketDto) {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await this.lockTicket(manager, ticketId)
      const existingAssigned = await this.findAiHistory(manager, ticket.id, dto.eventId, 'AI_ASSIGNED')
      if (existingAssigned) {
        return {
          status: 'ASSIGNED' as const,
          ticketId: ticket.id,
          assigneeId: ticket.assignee?.id ?? (existingAssigned.details?.assigneeId as string | undefined) ?? dto.assigneeId,
          assigneeName: ticket.assignee?.fullName ?? (existingAssigned.details?.assigneeName as string | undefined) ?? null,
        }
      }
      if (ticket.assignee) {
        return {
          status: 'SKIPPED_ALREADY_ASSIGNED' as const,
          ticketId: ticket.id,
          assigneeId: ticket.assignee.id,
        }
      }
      if (ticket.status !== TicketStatus.OPEN) {
        return {
          status: 'SKIPPED_NOT_ELIGIBLE' as const,
          ticketId: ticket.id,
          assigneeId: null,
        }
      }
      const agent = await manager.getRepository(User).findOne({
        where: { id: dto.assigneeId },
        relations: { role: true },
      })
      if (!agent || agent.role.code !== RoleCode.AGENT || agent.status !== UserStatus.ACTIVE) {
        throw new UnprocessableEntityException('Agente inválido o inactivo')
      }
      const oldStatus = ticket.status
      ticket.assignee = agent
      ticket.status = TicketStatus.ASSIGNED
      await manager.getRepository(Ticket).save(ticket)
      const details = {
        source: N8N_SOURCE,
        eventId: dto.eventId,
        workflowExecutionId: dto.workflowExecutionId ?? null,
        assigneeId: agent.id,
        assigneeName: agent.fullName,
        reason: dto.reason,
        confidence: dto.confidence,
      }
      try {
        const history = await manager.getRepository(TicketHistory).save(
          manager.getRepository(TicketHistory).create({
            ticket,
            changedBy: null,
            actorType: HistoryActorType.SYSTEM,
            actorName: AI_SYSTEM_ACTOR_NAME,
            eventType: 'AI_ASSIGNED',
            oldStatus,
            newStatus: TicketStatus.ASSIGNED,
            reason: dto.reason,
            details,
          }),
        )
        await this.notifications.dispatch(manager, {
          type: NotificationType.TICKET_ASSIGNED,
          actor: null,
          ticket,
          dedupeKey: `history:${history.id}`,
        })
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
      }
      return {
        status: 'ASSIGNED' as const,
        ticketId: ticket.id,
        assigneeId: agent.id,
        assigneeName: agent.fullName,
      }
    })
  }

  async recordAssignmentFailed(ticketId: string, dto: N8nAssignmentFailedDto) {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await this.lockTicket(manager, ticketId)
      if (ticket.assignee) {
        return {
          status: 'SKIPPED_ALREADY_ASSIGNED' as const,
          ticketId: ticket.id,
          assigneeId: ticket.assignee.id,
        }
      }
      const existing = await this.findAiHistory(manager, ticket.id, dto.eventId, 'AI_ASSIGNMENT_FAILED')
      if (existing) {
        return { status: 'RECORDED' as const, ticketId: ticket.id }
      }
      try {
        await manager.getRepository(TicketHistory).save(
          manager.getRepository(TicketHistory).create({
            ticket,
            changedBy: null,
            actorType: HistoryActorType.SYSTEM,
            actorName: AI_SYSTEM_ACTOR_NAME,
            eventType: 'AI_ASSIGNMENT_FAILED',
            oldStatus: ticket.status,
            newStatus: ticket.status,
            reason: dto.reason,
            details: {
              source: N8N_SOURCE,
              eventId: dto.eventId,
              workflowExecutionId: dto.workflowExecutionId ?? null,
              reason: dto.reason,
            },
          }),
        )
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
      }
      return { status: 'RECORDED' as const, ticketId: ticket.id }
    })
  }

  private async lockTicket(manager: EntityManager, ticketId: string) {
    const locked = await manager
      .getRepository(Ticket)
      .createQueryBuilder('ticket')
      .setLock('pessimistic_write')
      .where('ticket.id = :ticketId', { ticketId })
      .getOne()
    if (!locked) throw new NotFoundException('Ticket no encontrado')
    const ticket = await manager.getRepository(Ticket).findOne({
      where: { id: ticketId },
      relations: { requester: true, assignee: true, category: true, priority: true, client: true },
    })
    if (!ticket) throw new NotFoundException('Ticket no encontrado')
    return ticket
  }

  private findAiHistory(manager: EntityManager, ticketId: string, eventId: string, eventType: 'AI_ASSIGNED' | 'AI_ASSIGNMENT_FAILED') {
    return manager
      .getRepository(TicketHistory)
      .createQueryBuilder('history')
      .where('history.ticket_id = :ticketId', { ticketId })
      .andWhere('history.eventType = :eventType', { eventType })
      .andWhere("history.details ->> 'eventId' = :eventId", { eventId })
      .getOne()
  }

  private async loadActiveAgentsWithWorkload() {
    const agents = await this.users
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.role', 'role')
      .where('role.code = :role', { role: RoleCode.AGENT })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .orderBy('user.fullName', 'ASC')
      .getMany()
    const workloads = new Map<string, AgentWorkload>()
    for (const agent of agents) workloads.set(agent.id, emptyWorkload())
    if (agents.length === 0) return []
    const rows = await this.tickets
      .createQueryBuilder('ticket')
      .select('ticket.assignee_id', 'assigneeId')
      .addSelect('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ticket.assignee_id IN (:...ids)', { ids: agents.map((agent) => agent.id) })
      .andWhere('ticket.status IN (:...statuses)', { statuses: ACTIVE_WORKLOAD_STATUSES })
      .groupBy('ticket.assignee_id')
      .addGroupBy('ticket.status')
      .getRawMany<{ assigneeId: string; status: TicketStatus; count: string }>()
    for (const row of rows) {
      const current = workloads.get(row.assigneeId) ?? emptyWorkload()
      const count = Number(row.count) || 0
      let next = current
      for (let index = 0; index < count; index += 1) next = applyWorkloadStatus(next, row.status)
      workloads.set(row.assigneeId, next)
    }
    return agents.map((agent) => ({
      id: agent.id,
      fullName: agent.fullName,
      status: agent.status,
      workload: workloads.get(agent.id) ?? emptyWorkload(),
    }))
  }
}
