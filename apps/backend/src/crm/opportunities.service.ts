import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import { toCsv } from '../common/csv'
import {
  CrmOpportunity,
  CrmOpportunityStageHistory,
  CrmSurvey,
  CrmSurveyInvitation,
  OpportunityStage,
  SurveyStatus,
  SurveyTrigger,
  User,
} from '../database/entities'
import { applyClientScope } from './access'
import { ClientsService } from './clients.service'
import { ContactsService } from './contacts.service'
import { ChangeStageDto, CreateOpportunityDto, OpportunitiesQueryDto, UpdateOpportunityDto } from './dto'
import { assertStageChange, isTerminalStage, probabilityForStage, stagesForStatus } from './opportunity-rules'
import { createSurveyToken, invitationExpiry } from './survey-token'

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(CrmOpportunity) private readonly opportunities: Repository<CrmOpportunity>,
    @InjectRepository(CrmOpportunityStageHistory) private readonly history: Repository<CrmOpportunityStageHistory>,
    @InjectRepository(CrmSurvey) private readonly surveys: Repository<CrmSurvey>,
    @InjectRepository(CrmSurveyInvitation) private readonly invitations: Repository<CrmSurveyInvitation>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly clients: ClientsService,
    private readonly contacts: ContactsService,
    private readonly config: ConfigService,
  ) {}

  async list(query: OpportunitiesQueryDto, user: User) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage)
    const qb = this.opportunities.createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.client', 'client').leftJoinAndSelect('client.owner', 'clientOwner')
      .leftJoinAndSelect('opportunity.contact', 'contact').leftJoinAndSelect('opportunity.owner', 'owner')
    applyClientScope(qb, user)
    if (query.clientId) qb.andWhere('client.id = :clientId', { clientId: query.clientId })
    if (query.stage) qb.andWhere('opportunity.stage = :stage', { stage: query.stage })
    const statusStages = stagesForStatus(query.status)
    if (statusStages) qb.andWhere('opportunity.stage IN (:...statusStages)', { statusStages })
    if (query.ownerId) qb.andWhere('owner.id = :ownerId', { ownerId: query.ownerId })
    if (query.search) qb.andWhere(
      new Brackets((where) =>
        where
          .where('LOWER(opportunity.title) LIKE :q')
          .orWhere('LOWER(client.name) LIKE :q')
          .orWhere('LOWER(owner.fullName) LIKE :q')
          .orWhere('LOWER(contact.firstName) LIKE :q')
          .orWhere('LOWER(contact.lastName) LIKE :q'),
      ),
      { q: `%${query.search.toLowerCase()}%` },
    )
    const [items, total] = await qb.orderBy('opportunity.updatedAt', 'DESC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((item) => this.serialize(item)), meta: pagination(page, perPage, total) }
  }

  async create(dto: CreateOpportunityDto, user: User) {
    const client = await this.clients.getAccessible(dto.clientId, user)
    const contact = dto.contactId ? await this.contacts.findForClient(dto.contactId, client.id) : null
    const owner = dto.ownerId ? await this.users.findOneByOrFail({ id: dto.ownerId }) : user
    const stage = dto.stage ?? OpportunityStage.NEW
    if (stage === OpportunityStage.LOST) {
      throw new UnprocessableEntityException('Una oportunidad no debe nacer perdida')
    }
    const opportunity = await this.opportunities.save(this.opportunities.create({
      client, contact, owner, title: dto.title.trim(), amount: dto.amount, currency: (dto.currency ?? 'MXN').toUpperCase(),
      probability: probabilityForStage(stage, dto.probability), stage,
      expectedCloseDate: dto.expectedCloseDate ?? null, lostReason: null, notes: dto.notes?.trim() ?? '',
    }))
    await this.history.save(this.history.create({ opportunity, changedBy: user, oldStage: null, newStage: stage, reason: 'Creación' }))
    return this.serialize(await this.find(opportunity.id))
  }

  async update(id: string, dto: UpdateOpportunityDto, user: User) {
    const opportunity = await this.find(id)
    await this.clients.getAccessible(opportunity.client.id, user)
    if (isTerminalStage(opportunity.stage) && (dto.stage === undefined || dto.stage === opportunity.stage)) {
      if (dto.title || dto.amount !== undefined || dto.contactId) throw new UnprocessableEntityException('Reabre la oportunidad antes de editarla')
    }
    if (dto.clientId && dto.clientId !== opportunity.client.id) {
      opportunity.client = await this.clients.getAccessible(dto.clientId, user)
      if (dto.contactId === undefined) opportunity.contact = null
    }
    if (dto.contactId !== undefined) opportunity.contact = dto.contactId ? await this.contacts.findForClient(dto.contactId, opportunity.client.id) : null
    if (dto.ownerId) opportunity.owner = await this.users.findOneByOrFail({ id: dto.ownerId })
    if (dto.title !== undefined) opportunity.title = dto.title.trim()
    if (dto.amount !== undefined) opportunity.amount = dto.amount
    if (dto.currency) opportunity.currency = dto.currency.toUpperCase()
    if (dto.probability !== undefined && !isTerminalStage(opportunity.stage)) opportunity.probability = probabilityForStage(opportunity.stage, dto.probability)
    if (dto.expectedCloseDate !== undefined) opportunity.expectedCloseDate = dto.expectedCloseDate?.trim() ? dto.expectedCloseDate : null
    if (dto.notes !== undefined) opportunity.notes = dto.notes.trim()
    await this.opportunities.save(opportunity)
    return this.serialize(await this.find(id))
  }

  async changeStage(id: string, dto: ChangeStageDto, user: User) {
    const opportunity = await this.find(id)
    await this.clients.getAccessible(opportunity.client.id, user)
    assertStageChange(opportunity.stage, dto.stage, { lostReason: dto.lostReason, reopen: dto.reopen, reopenReason: dto.reopenReason })
    const old = opportunity.stage
    opportunity.stage = dto.stage
    opportunity.probability = probabilityForStage(dto.stage)
    opportunity.lostReason = dto.stage === OpportunityStage.LOST ? dto.lostReason!.trim() : dto.stage === OpportunityStage.WON ? null : opportunity.lostReason
    await this.opportunities.save(opportunity)
    await this.history.save(this.history.create({
      opportunity, changedBy: user, oldStage: old, newStage: dto.stage,
      reason: dto.reopen ? dto.reopenReason!.trim() : dto.lostReason?.trim() ?? null,
    }))
    const invitations = dto.stage === OpportunityStage.WON ? await this.inviteOnWon(opportunity) : []
    return { ...this.serialize(await this.find(id)), invitations }
  }

  async copyInvitationLink(opportunityId: string, surveyId: string, user: User) {
    const opportunity = await this.find(opportunityId)
    await this.clients.getAccessible(opportunity.client.id, user)
    const invitation = await this.invitations.findOne({ where: { opportunity: { id: opportunityId }, survey: { id: surveyId } }, relations: { survey: true } })
    if (!invitation) throw new NotFoundException('No hay invitación para esa encuesta')
    if (invitation.usedAt) throw new ConflictException('La encuesta ya fue respondida')
    const token = createSurveyToken()
    invitation.tokenHash = token.hash
    invitation.expiresAt = invitationExpiry()
    await this.invitations.save(invitation)
    return { surveyId: invitation.survey.id, surveyTitle: invitation.survey.title, url: this.publicUrl(token.raw), token: token.raw }
  }

  async exportCsv(query: OpportunitiesQueryDto, user: User) {
    const { items } = await this.list({ ...query, page: 1, perPage: 100 }, user)
    return toCsv(items.map((item) => ({
      titulo: item.title, cliente: item.clientName, etapa: item.stage, monto: item.amount, probabilidad: item.probability,
      moneda: item.currency, propietario: item.ownerName ?? '',
    })))
  }

  serialize(item: CrmOpportunity) {
    return {
      id: item.id, clientId: item.client.id, clientName: item.client.name, contactId: item.contact?.id ?? null,
      contactName: item.contact ? `${item.contact.firstName} ${item.contact.lastName}` : null,
      ownerId: item.owner?.id ?? null, ownerName: item.owner?.fullName ?? null, title: item.title, amount: item.amount,
      currency: item.currency, probability: item.probability, stage: item.stage, expectedCloseDate: item.expectedCloseDate,
      lostReason: item.lostReason, notes: item.notes, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(),
    }
  }

  private async inviteOnWon(opportunity: CrmOpportunity) {
    const surveys = await this.surveys.find({ where: { status: SurveyStatus.PUBLISHED, trigger: SurveyTrigger.OPPORTUNITY_WON } })
    const created: Array<{ surveyId: string; surveyTitle: string; url: string; token: string }> = []
    for (const survey of surveys) {
      const exists = await this.invitations.findOne({ where: { opportunity: { id: opportunity.id }, survey: { id: survey.id } } })
      if (exists) continue
      const token = createSurveyToken()
      await this.invitations.save(this.invitations.create({
        survey, opportunity, contact: opportunity.contact, client: opportunity.client,
        tokenHash: token.hash, expiresAt: invitationExpiry(), usedAt: null,
      }))
      created.push({ surveyId: survey.id, surveyTitle: survey.title, url: this.publicUrl(token.raw), token: token.raw })
    }
    return created
  }

  private publicUrl(raw: string) {
    const frontend = this.config.get('FRONTEND_URL', 'http://localhost:5173')
    return `${frontend.replace(/\/$/, '')}/public/surveys/${raw}`
  }

  private async find(id: string) {
    const opportunity = await this.opportunities.findOne({ where: { id }, relations: { client: true, contact: true, owner: true } })
    if (!opportunity) throw new NotFoundException('Oportunidad no encontrada')
    return opportunity
  }
}
