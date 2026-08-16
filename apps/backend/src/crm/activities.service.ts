import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import { ActivityStatus, CrmActivity, CrmOpportunity, User } from '../database/entities'
import { applyClientScope } from './access'
import { ClientsService } from './clients.service'
import { ContactsService } from './contacts.service'
import { ActivitiesQueryDto, CreateActivityDto, UpdateActivityDto } from './dto'

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(CrmActivity) private readonly activities: Repository<CrmActivity>,
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
      .leftJoinAndSelect('activity.owner', 'owner')
    applyClientScope(qb, user)
    if (query.clientId) qb.andWhere('client.id = :clientId', { clientId: query.clientId })
    if (query.opportunityId) qb.andWhere('opportunity.id = :opportunityId', { opportunityId: query.opportunityId })
    if (query.type) qb.andWhere('activity.type = :type', { type: query.type })
    if (query.status) qb.andWhere('activity.status = :status', { status: query.status })
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
    return this.serialize(await this.find(activity.id))
  }

  async update(id: string, dto: UpdateActivityDto, user: User) {
    const activity = await this.find(id)
    await this.clients.getAccessible(activity.client.id, user)
    if (dto.subject) activity.subject = dto.subject.trim()
    if (dto.body !== undefined) activity.body = dto.body.trim()
    if (dto.type) activity.type = dto.type
    if (dto.dueAt !== undefined) activity.dueAt = dto.dueAt ? new Date(dto.dueAt) : null
    if (dto.contactId !== undefined) activity.contact = dto.contactId ? await this.contacts.findForClient(dto.contactId, activity.client.id) : null
    await this.activities.save(activity)
    return this.serialize(await this.find(id))
  }

  async complete(id: string, user: User) {
    const activity = await this.find(id)
    await this.clients.getAccessible(activity.client.id, user)
    if (activity.status === ActivityStatus.COMPLETED) throw new UnprocessableEntityException('La actividad ya está completada')
    activity.status = ActivityStatus.COMPLETED
    activity.completedAt = new Date()
    await this.activities.save(activity)
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
    }
  }

  private async findOpportunity(id: string, clientId: string) {
    const opportunity = await this.opportunities.findOne({ where: { id }, relations: { client: true } })
    if (!opportunity || opportunity.client.id !== clientId) throw new UnprocessableEntityException('La oportunidad no pertenece al cliente')
    return opportunity
  }

  private async find(id: string) {
    const activity = await this.activities.findOne({
      where: { id },
      relations: { client: true, opportunity: true, contact: true, owner: true },
    })
    if (!activity) throw new NotFoundException('Actividad no encontrada')
    return activity
  }
}
