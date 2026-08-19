import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import { ActivityHistoryAction, ActivityStatus, CrmActivity, CrmActivityHistory, CrmOpportunity, User, UserStatus } from '../database/entities'
import { applyClientScope } from './access'
import { ClientsService } from './clients.service'
import { ContactsService } from './contacts.service'
import { ActivitiesQueryDto, CreateActivityDto, UpdateActivityDto } from './dto'

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(CrmActivity) private readonly activities: Repository<CrmActivity>,
    @InjectRepository(CrmActivityHistory) private readonly history: Repository<CrmActivityHistory>,
    @InjectRepository(CrmOpportunity) private readonly opportunities: Repository<CrmOpportunity>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly clients: ClientsService,
    private readonly contacts: ContactsService,
  ) {}

  async list(query: ActivitiesQueryDto, user: User) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage)
    const qb = this.activities.createQueryBuilder('activity')
      .leftJoinAndSelect('activity.client', 'client').leftJoinAndSelect('client.owner', 'clientOwner')
      .leftJoinAndSelect('activity.opportunity', 'opportunity').leftJoinAndSelect('activity.contact', 'contact')
      .leftJoinAndSelect('activity.owner', 'owner').leftJoinAndSelect('activity.history', 'activityHistory')
      .leftJoinAndSelect('activityHistory.changedBy', 'activityHistoryUser')
    applyClientScope(qb, user)
    if (query.clientId) qb.andWhere('client.id = :clientId', { clientId: query.clientId })
    if (query.opportunityId) qb.andWhere('opportunity.id = :opportunityId', { opportunityId: query.opportunityId })
    if (query.type) qb.andWhere('activity.type = :type', { type: query.type })
    if (query.status) qb.andWhere('activity.status = :status', { status: query.status })
    if (query.ownerId) qb.andWhere('owner.id = :ownerId', { ownerId: query.ownerId })
    if (query.dueFrom) qb.andWhere('(activity.dueAt IS NOT NULL AND activity.dueAt >= :dueFrom)', { dueFrom: query.dueFrom })
    if (query.dueTo) qb.andWhere('(activity.dueAt IS NOT NULL AND activity.dueAt <= :dueTo)', { dueTo: query.dueTo })
    if (query.search) qb.andWhere(new Brackets((where) => where.where('LOWER(activity.subject) LIKE :q')), { q: `%${query.search.toLowerCase()}%` })
    const [items, total] = await qb.orderBy('activity.dueAt', 'ASC').addOrderBy('activity.createdAt', 'DESC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((item) => this.serialize(item)), meta: pagination(page, perPage, total) }
  }

  async create(dto: CreateActivityDto, user: User) {
    const client = await this.clients.getAccessible(dto.clientId, user)
    const opportunity = dto.opportunityId ? await this.findOpportunity(dto.opportunityId, client.id) : null
    const contact = dto.contactId ? await this.contacts.findForClient(dto.contactId, client.id) : null
    const owner = dto.ownerId ? await this.users.findOneByOrFail({ id: dto.ownerId }) : user
    const activity = await this.activities.save(this.activities.create({
      client, opportunity, contact, owner, type: dto.type, status: ActivityStatus.PENDING,
      subject: dto.subject.trim(), body: dto.body?.trim() ?? '', dueAt: dto.dueAt ? new Date(dto.dueAt) : null, completedAt: null,
    }))
    await this.recordHistory(activity, user, ActivityHistoryAction.CREATED, { status: ActivityStatus.PENDING })
    return this.serialize(await this.find(activity.id))
  }

  async update(id: string, dto: UpdateActivityDto, user: User) {
    const activity = await this.find(id)
    await this.clients.getAccessible(activity.client.id, user)
    if (activity.status !== ActivityStatus.PENDING) throw new UnprocessableEntityException('Solo se pueden editar actividades pendientes')
    if (dto.clientId && dto.clientId !== activity.client.id) throw new UnprocessableEntityException('No se puede cambiar el cliente de una actividad')
    if (dto.opportunityId !== undefined) activity.opportunity = dto.opportunityId ? await this.findOpportunity(dto.opportunityId, activity.client.id) : null
    if (dto.ownerId !== undefined) activity.owner = dto.ownerId ? await this.findOwner(dto.ownerId) : user
    if (dto.subject !== undefined) activity.subject = dto.subject.trim()
    if (dto.body !== undefined) activity.body = dto.body.trim()
    if (dto.type) activity.type = dto.type
    if (dto.dueAt !== undefined) activity.dueAt = dto.dueAt ? new Date(dto.dueAt) : null
    if (dto.contactId !== undefined) activity.contact = dto.contactId ? await this.contacts.findForClient(dto.contactId, activity.client.id) : null
    await this.activities.save(activity)
    await this.recordHistory(activity, user, ActivityHistoryAction.UPDATED, { fields: Object.keys(dto) })
    return this.serialize(await this.find(id))
  }

  async complete(id: string, user: User) {
    const activity = await this.find(id)
    await this.clients.getAccessible(activity.client.id, user)
    if (activity.status === ActivityStatus.COMPLETED) throw new UnprocessableEntityException('La actividad ya está completada')
    if (activity.status === ActivityStatus.CANCELLED) throw new UnprocessableEntityException('La actividad está cancelada')
    activity.status = ActivityStatus.COMPLETED
    activity.completedAt = new Date()
    await this.activities.save(activity)
    await this.recordHistory(activity, user, ActivityHistoryAction.COMPLETED, null)
    return this.serialize(await this.find(id))
  }

  async cancel(id: string, user: User) {
    const activity = await this.find(id)
    await this.clients.getAccessible(activity.client.id, user)
    if (activity.status !== ActivityStatus.PENDING) throw new UnprocessableEntityException('Solo se pueden cancelar actividades pendientes')
    activity.status = ActivityStatus.CANCELLED
    await this.activities.save(activity)
    await this.recordHistory(activity, user, ActivityHistoryAction.CANCELLED, null)
    return this.serialize(await this.find(id))
  }

  serialize(item: CrmActivity) {
    return {
      id: item.id, clientId: item.client.id, clientName: item.client.name, opportunityId: item.opportunity?.id ?? null,
      opportunityTitle: item.opportunity?.title ?? null, contactId: item.contact?.id ?? null,
      contactName: item.contact ? `${item.contact.firstName} ${item.contact.lastName}` : null,
      ownerId: item.owner?.id ?? null, ownerName: item.owner?.fullName ?? null, type: item.type, status: item.status,
      subject: item.subject, body: item.body, dueAt: item.dueAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(),
      history: (item.history ?? []).map((entry) => ({ action: entry.action, changedBy: entry.changedBy?.fullName ?? null, createdAt: entry.createdAt.toISOString(), details: entry.details })),
    }
  }

  private async recordHistory(activity: CrmActivity, user: User, action: ActivityHistoryAction, details: Record<string, unknown> | null) {
    await this.history.save(this.history.create({ activity, changedBy: user, action, details }))
  }

  private async findOpportunity(id: string, clientId: string) {
    const opportunity = await this.opportunities.findOne({ where: { id }, relations: { client: true } })
    if (!opportunity || opportunity.client.id !== clientId) throw new UnprocessableEntityException('La oportunidad no pertenece al cliente')
    return opportunity
  }

  private async find(id: string) {
    const activity = await this.activities.findOne({
      where: { id },
      relations: { client: true, opportunity: true, contact: true, owner: true, history: { changedBy: true } },
    })
    if (!activity) throw new NotFoundException('Actividad no encontrada')
    return activity
  }

  private async findOwner(id: string) {
    return this.users.findOneOrFail({ where: { id, status: UserStatus.ACTIVE } })
  }
}
