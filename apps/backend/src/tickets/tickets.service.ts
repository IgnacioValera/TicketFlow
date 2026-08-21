import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import { unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import { isPortalRole } from '../common/roles'
import { CatalogStatus, Category, Client, HistoryActorType, Priority, RoleCode, SatisfactionSurvey, SlaPolicy, Ticket, TicketAttachment, TicketComment, TicketCounter, TicketHistory, TicketStatus, User, UserStatus } from '../database/entities'
import { NotificationType, statusNotificationType } from '../notifications/notification-rules'
import { NotificationsService } from '../notifications/notifications.service'
import { enqueueTicketCreatedWebhook } from '../integrations/n8n/n8n-assignment-rules'
import { N8nIntegrationService } from '../integrations/n8n/n8n-integration.service'
import { AssignTicketDto, ChangeStatusDto, CreateCommentDto, CreateTicketDto, EscalateTicketDto, SubmitSurveyDto, TicketsQueryDto, UpdateTicketDto } from './dto'
import { removeTempUpload, validateUploadedFile } from './file-validation'
import { statusesForPreset } from '../analytics/dashboard-rules'
import { resolveTicketParties } from './ticket-client-rules'
import { serializeHistoryRecord, sortTicketHistories } from './ticket-history'
import { TICKET_STATUS_LABELS } from './ticket-labels'
import { assertStatusReason, assertTicketMutable, assertTicketSurvey, assertTransition, calculateSla, hasPermission } from './ticket-rules'

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name)

  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Priority) private readonly priorities: Repository<Priority>,
    @InjectRepository(SlaPolicy) private readonly policies: Repository<SlaPolicy>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(TicketComment) private readonly comments: Repository<TicketComment>,
    @InjectRepository(TicketAttachment) private readonly attachments: Repository<TicketAttachment>,
    @InjectRepository(TicketHistory) private readonly history: Repository<TicketHistory>,
    @InjectRepository(SatisfactionSurvey) private readonly surveys: Repository<SatisfactionSurvey>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly n8n: N8nIntegrationService,
  ) {}

  async list(query: TicketsQueryDto, user: User) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage)
    const qb = this.tickets.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.category', 'category').leftJoinAndSelect('ticket.priority', 'priority')
      .leftJoinAndSelect('ticket.requester', 'requester').leftJoinAndSelect('requester.role', 'requesterRole')
      .leftJoinAndSelect('ticket.assignee', 'assignee').leftJoinAndSelect('assignee.role', 'assigneeRole')
      .leftJoinAndSelect('ticket.client', 'client')

    if (isPortalRole(user.role.code)) qb.andWhere('requester.id = :currentUserId', { currentUserId: user.id })
    else if (user.role.code === RoleCode.AGENT) qb.andWhere('assignee.id = :currentUserId', { currentUserId: user.id })
    else if (query.mine) qb.andWhere('(requester.id = :currentUserId OR assignee.id = :currentUserId)', { currentUserId: user.id })
    if (query.preset) qb.andWhere('ticket.status IN (:...presetStatuses)', { presetStatuses: statusesForPreset(query.preset) })
    else if (query.status) qb.andWhere('ticket.status = :status', { status: query.status })
    if (query.priorityId) qb.andWhere('priority.id = :priorityId', { priorityId: query.priorityId })
    if (query.categoryId) qb.andWhere('category.id = :categoryId', { categoryId: query.categoryId })
    if (query.assigneeId) qb.andWhere('assignee.id = :assigneeId', { assigneeId: query.assigneeId })
    if (query.unassigned) qb.andWhere('ticket.assignee_id IS NULL').andWhere('ticket.status = :open', { open: TicketStatus.OPEN })
    if (query.search) qb.andWhere(new Brackets((where) => where.where('LOWER(ticket.title) LIKE :q').orWhere('LOWER(ticket.folio) LIKE :q')), { q: `%${query.search.toLowerCase()}%` })
    const activeSlaStatuses = [TicketStatus.CLOSED, TicketStatus.CANCELLED]
    if (query.slaStatus === 'overdue') {
      qb.andWhere('ticket.slaDueAt <= NOW()').andWhere('ticket.status NOT IN (:...activeSlaStatuses)', { activeSlaStatuses })
    }
    if (query.slaStatus === 'warning') {
      qb.andWhere('ticket.slaDueAt > NOW()')
        .andWhere('ticket.status NOT IN (:...activeSlaStatuses)', { activeSlaStatuses })
        .andWhere('(EXTRACT(EPOCH FROM (ticket.slaDueAt - NOW())) / NULLIF(EXTRACT(EPOCH FROM (ticket.slaDueAt - ticket.slaCreatedAt)), 0)) <= 0.5')
    }
    if (query.slaStatus === 'on_time') {
      qb.andWhere('ticket.slaDueAt > NOW()')
        .andWhere('ticket.status NOT IN (:...activeSlaStatuses)', { activeSlaStatuses })
        .andWhere('(EXTRACT(EPOCH FROM (ticket.slaDueAt - NOW())) / NULLIF(EXTRACT(EPOCH FROM (ticket.slaDueAt - ticket.slaCreatedAt)), 0)) > 0.5')
    }
    const [items, total] = await qb.orderBy('ticket.createdAt', 'DESC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((ticket) => this.serialize(ticket)), meta: pagination(page, perPage, total) }
  }

  async create(dto: CreateTicketDto, user: User) {
    const actor = await this.users.findOne({ where: { id: user.id }, relations: { role: true, client: true } }) ?? user
    const selectedRequester = dto.requesterId && !isPortalRole(actor.role.code)
      ? await this.users.findOne({ where: { id: dto.requesterId }, relations: { role: true, client: true } })
      : null
    const parties = resolveTicketParties({
      actorId: actor.id,
      actorRole: actor.role.code,
      actorClientId: actor.client?.id ?? null,
      actorClientStatus: actor.client?.status ?? null,
      dtoClientId: dto.clientId ?? dto.companyId ?? null,
      dtoRequesterId: dto.requesterId ?? null,
      selectedRequester: selectedRequester
        ? {
            id: selectedRequester.id,
            role: selectedRequester.role.code,
            clientId: selectedRequester.client?.id ?? null,
            clientStatus: selectedRequester.client?.status ?? null,
          }
        : null,
    })
    this.throwPartyError(parties.error)

    const requester = parties.requesterId === actor.id ? actor : selectedRequester
    if (!requester) throw new NotFoundException('El solicitante seleccionado no existe.')
    const client = requester.client?.id === parties.clientId ? requester.client ?? null : null

    const [category, priority, policy] = await Promise.all([
      this.categories.findOneBy({ id: dto.categoryId, status: CatalogStatus.ACTIVE }),
      this.priorities.findOneBy({ id: dto.priorityId, status: CatalogStatus.ACTIVE }),
      this.policies.findOne({ where: { priority: { id: dto.priorityId }, status: CatalogStatus.ACTIVE }, relations: { priority: true } }),
    ])
    if (!category) throw new UnprocessableEntityException('Categoría no encontrada o inactiva')
    if (!priority) throw new UnprocessableEntityException('Prioridad no encontrada o inactiva')
    if (!policy) throw new UnprocessableEntityException('La prioridad no tiene una política SLA activa')

    const created = await this.dataSource.transaction(async (manager) => {
      const year = new Date().getFullYear()
      let counter = await manager.getRepository(TicketCounter).createQueryBuilder('counter').setLock('pessimistic_write').where('counter.year = :year', { year }).getOne()
      if (!counter) counter = await manager.getRepository(TicketCounter).save(manager.getRepository(TicketCounter).create({ year, value: 0 }))
      counter.value += 1
      await manager.getRepository(TicketCounter).save(counter)
      const createdAt = new Date()
      const ticket = await manager.getRepository(Ticket).save(manager.getRepository(Ticket).create({
        folio: `HD-${year}-${String(counter.value).padStart(4, '0')}`, title: dto.title.trim(), description: dto.description.trim(),
        status: TicketStatus.OPEN, category, priority, requester, assignee: null, client,
        slaCreatedAt: createdAt, slaDueAt: new Date(createdAt.getTime() + policy.resolutionHours * 3600000), resolutionHours: policy.resolutionHours, closedAt: null,
      }))
      const history = await manager.getRepository(TicketHistory).save(manager.getRepository(TicketHistory).create({
        ticket, changedBy: actor, actorType: HistoryActorType.USER, actorName: actor.fullName, eventType: 'CREATED', oldStatus: null, newStatus: TicketStatus.OPEN, reason: null, details: null,
      }))
      await this.notifications.dispatch(manager, {
        type: NotificationType.TICKET_CREATED,
        actor,
        ticket,
        dedupeKey: `history:${history.id}`,
      })
      return this.serialize(ticket)
    })
    enqueueTicketCreatedWebhook(
      (ticketId) => this.n8n.notifyTicketCreated(ticketId),
      String(created.id),
      (error) => {
        this.logger.error(
          `No se pudo notificar a n8n el ticket ${String(created.id)}`,
          error instanceof Error ? error.stack : undefined,
        )
      },
    )
    return created
  }

  async detail(id: string, user: User) { return this.serialize(await this.findVisible(id, user, true), true) }

  async update(id: string, dto: UpdateTicketDto, user: User) {
    const ticket = await this.findVisible(id, user)
    assertTicketMutable(ticket)
    const elevated = this.isElevated(user)
    const isRequester = ticket.requester.id === user.id
    const isAssignee = ticket.assignee?.id === user.id
    if (!elevated && !isAssignee && !(isRequester && ticket.status === TicketStatus.OPEN)) throw new ForbiddenException('No puedes editar este ticket')
    if (dto.title) ticket.title = dto.title.trim()
    if (dto.description) ticket.description = dto.description.trim()
    if (dto.categoryId) { const category = await this.categories.findOneBy({ id: dto.categoryId, status: CatalogStatus.ACTIVE }); if (!category) throw new UnprocessableEntityException('Categoría inválida'); ticket.category = category }
    if (dto.priorityId && dto.priorityId !== ticket.priority.id) {
      if (!elevated && !(isAssignee && hasPermission(user, 'PRIORITY_MANAGE'))) throw new ForbiddenException('No puedes cambiar la prioridad')
      const [priority, policy] = await Promise.all([this.priorities.findOneBy({ id: dto.priorityId, status: CatalogStatus.ACTIVE }), this.policies.findOne({ where: { priority: { id: dto.priorityId }, status: CatalogStatus.ACTIVE } })])
      if (!priority || !policy) throw new UnprocessableEntityException('Prioridad o SLA inválido')
      const previousPriority = ticket.priority.name
      ticket.priority = priority; ticket.resolutionHours = policy.resolutionHours; ticket.slaDueAt = new Date(ticket.slaCreatedAt.getTime() + policy.resolutionHours * 3600000)
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Ticket).save(ticket)
        const history = await manager.getRepository(TicketHistory).save(manager.getRepository(TicketHistory).create({
          ticket, changedBy: user, actorType: HistoryActorType.USER, actorName: user.fullName, eventType: 'PRIORITY_CHANGED', oldStatus: ticket.status, newStatus: ticket.status, reason: null, details: { from: previousPriority, to: priority.name },
        }))
        await this.notifications.dispatch(manager, {
          type: NotificationType.PRIORITY_CHANGED,
          actor: user,
          ticket,
          dedupeKey: `history:${history.id}`,
        })
      })
      return this.serialize(await this.findVisible(id, user, true), true)
    }
    return this.serialize(await this.tickets.save(ticket), true)
  }

  async changeStatus(id: string, dto: ChangeStatusDto, user: User) {
    const ticket = await this.findVisible(id, user)
    assertTransition(ticket.status, dto.status, user, ticket.assignee?.id === user.id, ticket.requester.id === user.id)
    assertStatusReason(ticket.status, dto.status, dto.reason)
    if (dto.status === TicketStatus.ASSIGNED && !ticket.assignee) throw new UnprocessableEntityException('Primero debes asignar un agente')
    const old = ticket.status
    ticket.status = dto.status
    ticket.closedAt = dto.status === TicketStatus.CLOSED ? new Date() : dto.status === TicketStatus.IN_PROGRESS && old === TicketStatus.CLOSED ? null : ticket.closedAt
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Ticket).save(ticket)
      await this.recordStatusChange(manager, ticket, user, old, dto.status, dto.reason?.trim())
    })
    return this.serialize(await this.findVisible(id, user, true), true)
  }

  async assign(id: string, dto: AssignTicketDto, user: User) {
    if (!this.isElevated(user)) throw new ForbiddenException('Sólo administrador o supervisor pueden asignar tickets')
    const ticket = await this.findVisible(id, user)
    assertTicketMutable(ticket)
    const agent = await this.users.findOne({ where: { id: dto.assigneeId, status: UserStatus.ACTIVE }, relations: { role: true } })
    if (!agent || agent.role.code !== RoleCode.AGENT) throw new UnprocessableEntityException('Agente inválido o inactivo')
    const oldStatus = ticket.status
    const previousAssignee = ticket.assignee
    const previousName = previousAssignee?.fullName ?? null
    ticket.assignee = agent
    if (ticket.status === TicketStatus.OPEN) ticket.status = TicketStatus.ASSIGNED
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Ticket).save(ticket)
      const eventType = previousName ? 'REASSIGNED' : 'ASSIGNED'
      const history = await manager.getRepository(TicketHistory).save(manager.getRepository(TicketHistory).create({
        ticket, changedBy: user, actorType: HistoryActorType.USER, actorName: user.fullName, eventType, oldStatus, newStatus: ticket.status, reason: 'Asignación de responsable', details: { from: previousName, to: agent.fullName, assignmentKind: 'MANUAL', assigneeName: agent.fullName },
      }))
      await this.notifications.dispatch(manager, {
        type: previousName ? NotificationType.TICKET_REASSIGNED : NotificationType.TICKET_ASSIGNED,
        actor: user,
        ticket,
        dedupeKey: `history:${history.id}`,
        previousAssigneeId: previousAssignee?.id ?? null,
      })
    })
    return this.serialize(await this.findVisible(id, user, true), true)
  }

  async escalate(id: string, dto: EscalateTicketDto, user: User) {
    const ticket = await this.findVisible(id, user)
    assertTransition(ticket.status, TicketStatus.ESCALATED, user, ticket.assignee?.id === user.id, ticket.requester.id === user.id)
    assertStatusReason(ticket.status, TicketStatus.ESCALATED, dto.reason)
    const old = ticket.status
    ticket.status = TicketStatus.ESCALATED
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Ticket).save(ticket)
      await this.recordStatusChange(manager, ticket, user, old, ticket.status, dto.reason.trim())
    })
    return this.serialize(await this.findVisible(id, user, true), true)
  }

  async close(id: string, user: User) {
    const ticket = await this.findVisible(id, user)
    if (ticket.status !== TicketStatus.RESOLVED) throw new UnprocessableEntityException('Sólo se puede cerrar un ticket resuelto')
    assertTransition(ticket.status, TicketStatus.CLOSED, user, ticket.assignee?.id === user.id, ticket.requester.id === user.id)
    const old = ticket.status
    ticket.status = TicketStatus.CLOSED
    ticket.closedAt = new Date()
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Ticket).save(ticket)
      await this.recordStatusChange(manager, ticket, user, old, ticket.status)
    })
    return this.serialize(await this.findVisible(id, user, true), true)
  }

  async listComments(id: string, user: User) { const ticket = await this.findVisible(id, user); const where = this.comments.createQueryBuilder('comment').leftJoinAndSelect('comment.author', 'author').where('comment.ticket_id = :id', { id }); if (isPortalRole(user.role.code)) where.andWhere('comment.isInternal = false'); return (await where.orderBy('comment.createdAt', 'ASC').getMany()).map((comment) => this.serializeComment(comment, ticket.id)) }
  async addComment(id: string, dto: CreateCommentDto, user: User) {
    const ticket = await this.findVisible(id, user)
    assertTicketMutable(ticket)
    if (!hasPermission(user, 'COMMENT_PUBLIC')) throw new ForbiddenException('No puedes comentar tickets')
    if (dto.isInternal && !hasPermission(user, 'COMMENT_INTERNAL')) throw new ForbiddenException('No puedes crear comentarios internos')
    return this.dataSource.transaction(async (manager) => {
      const comment = await manager.getRepository(TicketComment).save(manager.getRepository(TicketComment).create({
        ticket, author: user, body: dto.body.trim(), isInternal: Boolean(dto.isInternal),
      }))
      await this.notifications.dispatch(manager, {
        type: comment.isInternal ? NotificationType.INTERNAL_COMMENT : NotificationType.COMMENT_PUBLIC,
        actor: user,
        ticket,
        dedupeKey: `comment:${comment.id}`,
      })
      return this.serializeComment(comment, ticket.id)
    })
  }
  async listAttachments(id: string, user: User) { const ticket = await this.findVisible(id, user); const items = await this.attachments.find({ where: { ticket: { id: ticket.id } }, relations: { uploader: true }, order: { createdAt: 'ASC' } }); return items.map((item) => this.serializeAttachment(item, ticket.id)) }
  async addAttachment(id: string, file: Express.Multer.File, user: User) {
    let storedPath: string | undefined
    try {
      const ticket = await this.findVisible(id, user)
      assertTicketMutable(ticket)
      if (!hasPermission(user, 'ATTACHMENT_UPLOAD')) throw new ForbiddenException('No puedes adjuntar archivos')
      const validated = await validateUploadedFile(file)
      const directory = join(process.cwd(), this.config.get('UPLOAD_DIR', 'uploads'))
      mkdirSync(directory, { recursive: true })
      const storedName = `${randomUUID()}${validated.canonicalExt}`
      storedPath = join(directory, storedName)
      await writeFile(storedPath, validated.buffer)
      try {
        return await this.dataSource.transaction(async (manager) => {
          const item = await manager.getRepository(TicketAttachment).save(manager.getRepository(TicketAttachment).create({
            ticket,
            uploader: user,
            fileName: validated.displayName,
            storedName,
            mimeType: validated.mimeType,
            sizeBytes: validated.sizeBytes,
          }))
          await this.notifications.dispatch(manager, {
            type: NotificationType.ATTACHMENT_PUBLIC,
            actor: user,
            ticket,
            dedupeKey: `attachment:${item.id}`,
          })
          return this.serializeAttachment(item, ticket.id)
        })
      } catch (error) {
        await unlink(storedPath).catch(() => undefined)
        storedPath = undefined
        throw error
      }
    } catch (error) {
      await removeTempUpload(file)
      throw error
    }
  }

  async deleteAttachment(id: string, user: User) {
    const item = await this.attachments.findOne({ where: { id }, relations: { ticket: { requester: true, assignee: true }, uploader: true } })
    if (!item) throw new NotFoundException('Adjunto no encontrado')
    await this.assertVisible(item.ticket, user)
    assertTicketMutable(item.ticket)
    if (item.uploader.id !== user.id && !this.isElevated(user)) throw new ForbiddenException('No puedes eliminar este adjunto')
    await this.attachments.remove(item)
    const directory = this.config.get('UPLOAD_DIR', 'uploads')
    await unlink(join(process.cwd(), directory, item.storedName)).catch(() => undefined)
  }
  async getSla(id: string, user: User) { const ticket = await this.findVisible(id, user); return calculateSla(ticket.slaCreatedAt, ticket.slaDueAt, ticket.resolutionHours) }
  async submitSurvey(id: string, dto: SubmitSurveyDto, user: User) {
    const ticket = await this.findVisible(id, user)
    assertTicketSurvey(ticket, user)
    if (await this.surveys.exists({ where: { ticket: { id } } })) throw new ConflictException('La encuesta ya fue respondida')
    const survey = await this.surveys.save(this.surveys.create({ ticket, submittedBy: user, rating: dto.rating, comment: dto.comment?.trim() ?? null }))
    return { id: survey.id, ticketId: id, rating: survey.rating, comment: survey.comment ?? undefined, submittedAt: survey.submittedAt.toISOString() }
  }

  private async findVisible(id: string, user: User, relations = false) { const ticket = await this.tickets.findOne({ where: { id }, relations: relations ? { histories: true, comments: true, attachments: true, survey: true } : {} }); if (!ticket) throw new NotFoundException('Ticket no encontrado'); await this.assertVisible(ticket, user); return ticket }
  private async assertVisible(ticket: Ticket, user: User) { if (this.isElevated(user)) return; if (isPortalRole(user.role.code) && ticket.requester.id === user.id) return; if (user.role.code === RoleCode.AGENT && ticket.assignee?.id === user.id) return; throw new ForbiddenException('No tienes acceso a este ticket') }
  private isElevated(user: User) { return user.role.code === RoleCode.ADMIN || user.role.code === RoleCode.SUPERVISOR }
  private async recordStatusChange(manager: EntityManager, ticket: Ticket, user: User, oldStatus: TicketStatus | null, newStatus: TicketStatus, reason?: string) {
    const history = await manager.getRepository(TicketHistory).save(manager.getRepository(TicketHistory).create({
      ticket, changedBy: user, actorType: HistoryActorType.USER, actorName: user.fullName, eventType: 'STATUS_CHANGED', oldStatus, newStatus, reason: reason ?? null, details: null,
    }))
    const type = oldStatus ? statusNotificationType(oldStatus, newStatus) : null
    if (!type) return
    await this.notifications.dispatch(manager, {
      type,
      actor: user,
      ticket,
      dedupeKey: `history:${history.id}`,
      statusLabel: TICKET_STATUS_LABELS[newStatus],
    })
  }
  private throwPartyError(error?: { status: 404 | 409 | 422; message: string }) {
    if (!error) return
    if (error.status === 404) throw new NotFoundException(error.message)
    if (error.status === 409) throw new ConflictException(error.message)
    throw new UnprocessableEntityException(error.message)
  }
  private serializeComment(comment: TicketComment, ticketId: string) { return { id: comment.id, ticketId, userId: comment.author.id, authorName: comment.author.fullName, body: comment.body, isInternal: comment.isInternal, createdAt: comment.createdAt.toISOString() } }
  private serializeAttachment(item: TicketAttachment, ticketId: string) { return { id: item.id, ticketId, fileName: item.fileName, mimeType: item.mimeType, sizeBytes: item.sizeBytes, fileUrl: `${this.config.get('APP_URL', 'http://localhost:8000')}/uploads/${item.storedName}`, uploadedBy: item.uploader.id, uploadedByName: item.uploader.fullName, createdAt: item.createdAt.toISOString() } }
  serialize(ticket: Ticket, includeRelations = false) {
    const data: Record<string, unknown> = {
      id: ticket.id, folio: ticket.folio, title: ticket.title, description: ticket.description, status: ticket.status,
      categoryId: ticket.category.id, categoryName: ticket.category.name, priorityId: ticket.priority.id, priorityName: ticket.priority.name, priorityColor: ticket.priority.color,
      requesterId: ticket.requester.id, requesterName: ticket.requester.fullName,
      assigneeId: ticket.assignee?.id ?? null, assigneeName: ticket.assignee?.fullName ?? null,
      clientId: ticket.client?.id ?? null, clientName: ticket.client?.name ?? null,
      companyId: ticket.client?.id ?? null, companyName: ticket.client?.name ?? null,
      slaDueAt: ticket.slaDueAt.toISOString(), slaCreatedAt: ticket.slaCreatedAt.toISOString(), resolutionHours: ticket.resolutionHours,
      closedAt: ticket.closedAt?.toISOString() ?? null, createdAt: ticket.createdAt.toISOString(),
    }
    if (includeRelations) {
      data.statusHistory = sortTicketHistories(ticket.histories ?? []).map((h) => serializeHistoryRecord(h, ticket.id))
      data.comments = (ticket.comments ?? []).filter((c) => !c.isInternal).map((c) => this.serializeComment(c, ticket.id))
      data.attachments = (ticket.attachments ?? []).map((a) => this.serializeAttachment(a, ticket.id))
      data.survey = ticket.survey ? { id: ticket.survey.id, ticketId: ticket.id, rating: ticket.survey.rating, comment: ticket.survey.comment ?? undefined, submittedAt: ticket.survey.submittedAt.toISOString() } : null
    }
    return data
  }
}
