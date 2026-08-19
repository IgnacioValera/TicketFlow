import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import { toCsv } from '../common/csv'
import {
  ActivityStatus,
  Client,
  ClientStatus,
  CrmActivity,
  CrmContact,
  CrmOpportunity,
  CrmOpportunityStageHistory,
  CrmSurveyInvitation,
  CrmSurveyResponse,
  OpportunityStage,
  SatisfactionSurvey,
  Ticket,
  TicketStatus,
  User,
  UserStatus,
} from '../database/entities'
import { applyClientScope, canAccessClient, clientAccessMode } from './access'
import { CreateClientDto, ClientsQueryDto, UpdateClientDto } from './dto'
import { calculateClientScore } from './score'

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(CrmContact) private readonly contacts: Repository<CrmContact>,
    @InjectRepository(CrmOpportunity) private readonly opportunities: Repository<CrmOpportunity>,
    @InjectRepository(CrmActivity) private readonly activities: Repository<CrmActivity>,
    @InjectRepository(CrmOpportunityStageHistory) private readonly stageHistory: Repository<CrmOpportunityStageHistory>,
    @InjectRepository(SatisfactionSurvey) private readonly ticketSurveys: Repository<SatisfactionSurvey>,
    @InjectRepository(CrmSurveyResponse) private readonly crmResponses: Repository<CrmSurveyResponse>,
  ) {}

  async list(query: ClientsQueryDto, user: User) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage)
    const qb = applyClientScope(this.clients.createQueryBuilder('client').leftJoinAndSelect('client.owner', 'owner'), user)
    if (query.status) qb.andWhere('client.status = :status', { status: query.status })
    if (query.segment) qb.andWhere('client.segment = :segment', { segment: query.segment })
    if (query.tier) qb.andWhere('client.tier = :tier', { tier: query.tier })
    if (query.industry) qb.andWhere('client.industry = :industry', { industry: query.industry })
    if (query.region) qb.andWhere('client.region = :region', { region: query.region })
    if (query.ownerId) qb.andWhere('owner.id = :ownerId', { ownerId: query.ownerId })
    if (query.minScore !== undefined) qb.andWhere('client.score >= :minScore', { minScore: query.minScore })
    if (query.maxScore !== undefined) qb.andWhere('client.score <= :maxScore', { maxScore: query.maxScore })
    const search = query.search?.trim()
    if (search) {
      qb.andWhere(
        new Brackets((where) =>
          where
            .where('LOWER(client.name) LIKE :q')
            .orWhere('LOWER(client.email) LIKE :q')
            .orWhere('LOWER(client.industry) LIKE :q')
            .orWhere('LOWER(client.region) LIKE :q')
            .orWhere('LOWER(client.phone) LIKE :q'),
        ),
        { q: `%${search.toLowerCase()}%` },
      )
    }
    const [items, total] = await qb.orderBy('client.name', 'ASC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((item) => this.serialize(item)), meta: pagination(page, perPage, total) }
  }

  async create(dto: CreateClientDto, user: User) {
    this.assertWrite(user)
    await this.ensureUniqueName(dto.name)
    await this.ensureUniqueEmail(dto.email)
    const owner = dto.ownerId ? await this.findOwner(dto.ownerId) : user.role.code === 'SALES' ? user : null
    const client = await this.clients.save(this.clients.create({
      name: dto.name.trim(), industry: dto.industry.trim(), region: dto.region.trim(), tier: dto.tier, segment: dto.segment,
      email: dto.email.toLowerCase().trim(), phone: dto.phone.trim(), status: dto.status ?? ClientStatus.PROSPECT, owner, score: 50,
    }))
    return this.serialize(client)
  }

  async update(id: string, dto: UpdateClientDto, user: User) {
    const client = await this.getAccessible(id, user)
    this.assertWrite(user)
    if (dto.name && dto.name.trim().toLowerCase() !== client.name.toLowerCase()) await this.ensureUniqueName(dto.name, id)
    if (dto.email && dto.email.trim().toLowerCase() !== client.email.toLowerCase()) await this.ensureUniqueEmail(dto.email, id)
    if (dto.name) client.name = dto.name.trim()
    if (dto.industry) client.industry = dto.industry.trim()
    if (dto.region) client.region = dto.region.trim()
    if (dto.tier) client.tier = dto.tier
    if (dto.segment) client.segment = dto.segment
    if (dto.email) client.email = dto.email.toLowerCase().trim()
    if (dto.phone) client.phone = dto.phone.trim()
    if (dto.status) client.status = dto.status
    if (dto.ownerId !== undefined) client.owner = dto.ownerId ? await this.findOwner(dto.ownerId) : null
    return this.serialize(await this.clients.save(client))
  }

  async remove(id: string, user: User) {
    const client = await this.getAccessible(id, user)
    this.assertWrite(user)
    client.status = ClientStatus.INACTIVE
    return this.serialize(await this.clients.save(client))
  }

  async detail(id: string, user: User) {
    return this.serialize(await this.getAccessible(id, user))
  }

  async customer360(id: string, user: User) {
    const client = await this.getAccessible(id, user)
    const [contacts, opportunities, activities, tickets, history] = await Promise.all([
      this.contacts.find({ where: { client: { id } }, relations: { client: true }, order: { isPrimary: 'DESC', lastName: 'ASC' } }),
      this.opportunities.find({ where: { client: { id } }, order: { updatedAt: 'DESC' } }),
      this.activities.find({ where: { client: { id } }, order: { createdAt: 'DESC' }, take: 50 }),
      this.tickets.find({ where: { client: { id } }, order: { createdAt: 'DESC' }, take: 50 }),
      this.stageHistory.find({ where: { opportunity: { client: { id } } }, relations: { opportunity: true }, order: { createdAt: 'DESC' }, take: 50 }),
    ])
    const score = await this.recalculateScore(id, user, false)
    const timeline = [
      ...activities.map((item) => ({ type: 'activity' as const, at: item.createdAt.toISOString(), title: item.subject, detail: item.type, id: item.id })),
      ...history.map((item) => ({ type: 'stage' as const, at: item.createdAt.toISOString(), title: item.opportunity.title, detail: `${item.oldStage ?? '—'} → ${item.newStage}`, id: item.id })),
      ...tickets.map((item) => ({ type: 'ticket' as const, at: item.createdAt.toISOString(), title: item.folio, detail: item.title, id: item.id })),
    ].sort((a, b) => b.at.localeCompare(a.at))
    return {
      client: this.serialize(client),
      kpis: {
        score: score.score,
        dimensions: score.dimensions,
        contacts: contacts.length,
        openOpportunities: opportunities.filter((item) => item.stage !== OpportunityStage.WON && item.stage !== OpportunityStage.LOST).length,
        wonAmount: opportunities.filter((item) => item.stage === OpportunityStage.WON).reduce((sum, item) => sum + item.amount, 0),
        openTickets: tickets.filter((item) => item.status !== TicketStatus.CLOSED && item.status !== TicketStatus.CANCELLED).length,
      },
      contacts: contacts.map((item) => this.serializeContact(item)),
      opportunities: opportunities.map((item) => this.serializeOpportunity(item)),
      activities: activities.map((item) => this.serializeActivity(item)),
      tickets: tickets.map((item) => ({ id: item.id, folio: item.folio, title: item.title, status: item.status, createdAt: item.createdAt.toISOString() })),
      timeline,
    }
  }

  async recalculateScore(id: string, user: User, persist = true) {
    const client = await this.getAccessible(id, user)
    const [ticketRows, npsRows, opps, activities, tickets] = await Promise.all([
      this.ticketSurveys.createQueryBuilder('survey').innerJoin('survey.ticket', 'ticket').where('ticket.client_id = :id', { id }).getMany(),
      this.crmResponses.createQueryBuilder('response').innerJoin(CrmSurveyInvitation, 'invitation', 'invitation.id = response.invitation_id').where('invitation.client_id = :id', { id }).andWhere('response.nps_score IS NOT NULL').getMany(),
      this.opportunities.find({ where: { client: { id } } }),
      this.activities.find({ where: { client: { id } } }),
      this.tickets.find({ where: { client: { id } } }),
    ])
    const since = Date.now() - 90 * 24 * 3600 * 1000
    const result = calculateClientScore({
      ticketRatings: ticketRows.map((row) => row.rating),
      crmNpsScores: npsRows.map((row) => row.npsScore!).filter((score) => score !== null),
      wonCount: opps.filter((item) => item.stage === OpportunityStage.WON).length,
      lostCount: opps.filter((item) => item.stage === OpportunityStage.LOST).length,
      completedActivities90d: activities.filter((item) => item.status === ActivityStatus.COMPLETED && item.completedAt && item.completedAt.getTime() >= since).length,
      totalActivities: activities.length,
      closedTickets: tickets.filter((item) => item.status === TicketStatus.CLOSED || item.status === TicketStatus.RESOLVED).length,
      totalTickets: tickets.length,
      ageDays: Math.max(0, Math.floor((Date.now() - client.createdAt.getTime()) / 86400000)),
    })
    if (persist) {
      client.score = result.score
      await this.clients.save(client)
    }
    return result
  }

  async exportCsv(query: ClientsQueryDto, user: User) {
    const { items } = await this.list({ ...query, page: 1, perPage: 100 }, user)
    return toCsv(items.map((item) => ({
      nombre: item.name, giro: item.industry, region: item.region, segmento: item.segment, nivel: item.tier,
      correo: item.email, telefono: item.phone, estado: item.status, score: item.score, propietario: item.ownerName ?? '',
    })))
  }

  async getAccessible(id: string, user: User) {
    const client = await this.clients.findOne({ where: { id }, relations: { owner: true } })
    if (!client) throw new NotFoundException('Cliente no encontrado')
    const agentIds = clientAccessMode(user) === 'tickets'
      ? (await this.tickets.find({ where: { assignee: { id: user.id } }, relations: { client: true } })).map((ticket) => ticket.client?.id).filter((value): value is string => Boolean(value))
      : []
    if (!canAccessClient(user, client, agentIds)) throw new ForbiddenException('No tienes acceso a este cliente')
    return client
  }

  serialize(client: Client) {
    return {
      id: client.id, name: client.name, industry: client.industry, region: client.region, tier: client.tier, segment: client.segment,
      email: client.email, phone: client.phone, status: client.status, score: client.score,
      ownerId: client.owner?.id ?? null, ownerName: client.owner?.fullName ?? null,
      createdAt: client.createdAt.toISOString(), updatedAt: client.updatedAt.toISOString(),
    }
  }

  private serializeContact(item: CrmContact) {
    return { id: item.id, clientId: item.client?.id, clientName: item.client?.name ?? '', firstName: item.firstName, lastName: item.lastName, email: item.email, phone: item.phone, jobTitle: item.jobTitle, isPrimary: item.isPrimary }
  }

  private serializeOpportunity(item: CrmOpportunity) {
    return { id: item.id, title: item.title, amount: item.amount, stage: item.stage, probability: item.probability, currency: item.currency }
  }

  private serializeActivity(item: CrmActivity) {
    return { id: item.id, type: item.type, status: item.status, subject: item.subject, dueAt: item.dueAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() }
  }

  private assertWrite(user: User) {
    if (clientAccessMode(user) === 'tickets' || clientAccessMode(user) === 'none') throw new ForbiddenException('No puedes modificar clientes')
  }

  private async ensureUniqueName(name: string, excludeId?: string) {
    const qb = this.clients.createQueryBuilder('client').where('LOWER(client.name) = LOWER(:name)', { name: name.trim() })
    if (excludeId) qb.andWhere('client.id <> :excludeId', { excludeId })
    if (await qb.getExists()) throw new ConflictException('Ya existe un cliente con ese nombre')
  }

  private async ensureUniqueEmail(email: string, excludeId?: string) {
    const qb = this.clients.createQueryBuilder('client').where('LOWER(client.email) = LOWER(:email)', { email: email.trim() })
    if (excludeId) qb.andWhere('client.id <> :excludeId', { excludeId })
    if (await qb.getExists()) throw new ConflictException('Ya existe un cliente con ese correo')
  }

  private async findOwner(id: string) {
    const owner = await this.users.findOne({ where: { id, status: UserStatus.ACTIVE }, relations: { role: true } })
    if (!owner) throw new NotFoundException('Propietario no encontrado')
    return owner
  }
}
