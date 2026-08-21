import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, EntityManager, Repository } from 'typeorm'
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
import { isUniqueViolation } from './db-errors'
import { ChangeStageDto, CreateOpportunityDto, CreateSurveyInvitationDto, OpportunitiesQueryDto, UpdateOpportunityDto } from './dto'
import { assertStageChange, isTerminalStage, probabilityForStage, stagesForStatus } from './opportunity-rules'
import {
  ACTIVE_INVITATION_EXISTS,
  buildPublicSurveyUrl,
  canRegenerateInvitation,
  invitationCardStatus,
  isAutomaticSurveyTrigger,
  REGENERATE_CONFIRMATION_REQUIRED,
  RESPONDED_INVITATION,
  serializeInvitationCard,
  shouldInviteOnWon,
  WON_WITHOUT_ACTIVE_SURVEY,
} from './survey-invitation'
import { createSurveyToken, invitationExpiry } from './survey-token'

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name)

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

  async getById(id: string, user: User) {
    const opportunity = await this.find(id)
    await this.clients.getAccessible(opportunity.client.id, user)
    return this.serializeWithSurvey(opportunity)
  }

  async changeStage(id: string, dto: ChangeStageDto, user: User) {
    return this.opportunities.manager.transaction(async (manager) => {
      const opportunity = await this.lockOpportunity(manager, id)
      await this.clients.getAccessible(opportunity.client.id, user)
      assertStageChange(opportunity.stage, dto.stage, {
        lostReason: dto.lostReason,
        reopen: dto.reopen,
        reopenReason: dto.reopenReason,
      })
      const old = opportunity.stage
      opportunity.stage = dto.stage
      opportunity.probability = probabilityForStage(dto.stage)
      opportunity.lostReason =
        dto.stage === OpportunityStage.LOST
          ? dto.lostReason!.trim()
          : dto.stage === OpportunityStage.WON
            ? null
            : opportunity.lostReason
      await manager.save(opportunity)
      await manager.save(
        manager.create(CrmOpportunityStageHistory, {
          opportunity,
          changedBy: this.actorRef(user),
          oldStage: old,
          newStage: dto.stage,
          reason: dto.reopen ? dto.reopenReason!.trim() : dto.lostReason?.trim() ?? null,
        }),
      )
      const surveyInvitation = shouldInviteOnWon(old, dto.stage)
        ? await this.inviteOnWon(manager, opportunity, user)
        : null
      const fresh = await manager.findOneOrFail(CrmOpportunity, {
        where: { id },
        relations: { client: true, contact: true, owner: true },
      })
      return { ...this.serialize(fresh), surveyInvitation }
    })
  }

  async createSurveyInvitation(opportunityId: string, dto: CreateSurveyInvitationDto, user: User) {
    return this.opportunities.manager.transaction(async (manager) => {
      const opportunity = await this.lockOpportunity(manager, opportunityId)
      await this.clients.getAccessible(opportunity.client.id, user)
      const survey = await this.resolveSurveyForInvitation(manager, opportunity, dto.surveyId)
      const existing = await this.lockInvitation(manager, opportunity.id, survey.id)
      if (existing?.usedAt) throw new ConflictException(RESPONDED_INVITATION)
      const status = invitationCardStatus({
        hasPublishedAutomaticSurvey: true,
        invitation: existing,
      })
      if (existing && canRegenerateInvitation(status) && !dto.confirmRegenerate) {
        throw new ConflictException(REGENERATE_CONFIRMATION_REQUIRED)
      }
      const token = createSurveyToken()
      const invitation = existing ?? manager.create(CrmSurveyInvitation, { survey, opportunity })
      invitation.survey = survey
      invitation.opportunity = opportunity
      invitation.contact = opportunity.contact ?? null
      invitation.client = opportunity.client
      invitation.createdBy = this.actorRef(user)
      invitation.trigger = survey.trigger
      invitation.tokenHash = token.hash
      invitation.expiresAt = invitationExpiry()
      invitation.usedAt = null
      invitation.revokedAt = null
      try {
        await manager.save(invitation)
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        throw new ConflictException(ACTIVE_INVITATION_EXISTS)
      }
      this.logger.log(`Usuario ${user.id} generó una invitación de encuesta para la oportunidad ${opportunity.id}`)
      return {
        created: true,
        surveyId: survey.id,
        surveyTitle: survey.title,
        responseUrl: this.publicUrl(token.raw),
        expiresAt: this.iso(invitation.expiresAt),
      }
    })
  }

  async copyInvitationLink(opportunityId: string, surveyId: string, user: User) {
    return this.createSurveyInvitation(opportunityId, { surveyId, confirmRegenerate: false }, user)
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

  async serializeWithSurvey(item: CrmOpportunity) {
    const published = await this.surveys.findOne({
      where: { status: SurveyStatus.PUBLISHED, trigger: SurveyTrigger.OPPORTUNITY_WON },
    })
    const preferred = published
      ? await this.invitations.findOne({
          where: { opportunity: { id: item.id }, survey: { id: published.id } },
          relations: { survey: true },
        })
      : await this.invitations.findOne({
          where: { opportunity: { id: item.id } },
          relations: { survey: true },
          order: { createdAt: 'DESC' },
        })
    const status = invitationCardStatus({
      hasPublishedAutomaticSurvey: Boolean(published),
      invitation: preferred,
    })
    const card = serializeInvitationCard(
      status,
      preferred
        ? {
            surveyId: preferred.survey.id,
            surveyTitle: preferred.survey.title,
            trigger: preferred.trigger,
            createdAt: preferred.createdAt,
            expiresAt: preferred.expiresAt,
            usedAt: preferred.usedAt,
          }
        : null,
    )
    return {
      ...this.serialize(item),
      surveyInvitation: {
        ...card,
        surveyId: preferred?.survey.id ?? published?.id ?? null,
        surveyTitle: preferred?.survey.title ?? published?.title ?? null,
        trigger: preferred?.trigger ?? published?.trigger ?? null,
      },
    }
  }

  private async inviteOnWon(manager: EntityManager, opportunity: CrmOpportunity, user: User) {
    const survey = await manager.findOne(CrmSurvey, {
      where: { status: SurveyStatus.PUBLISHED, trigger: SurveyTrigger.OPPORTUNITY_WON },
    })
    if (!survey) {
      return { created: false as const, message: WON_WITHOUT_ACTIVE_SURVEY }
    }
    const existing = await this.lockInvitation(manager, opportunity.id, survey.id)
    if (existing) {
      return {
        created: false as const,
        surveyId: survey.id,
        surveyTitle: survey.title,
        message: existing.usedAt ? RESPONDED_INVITATION : ACTIVE_INVITATION_EXISTS,
      }
    }
    const token = createSurveyToken()
    const frontend = this.config.get<string>('FRONTEND_URL')?.trim()
    if (!frontend) {
      this.logger.error('FRONTEND_URL no está configurada; la oportunidad se marcó como ganada sin enlace de encuesta')
      return {
        created: false as const,
        surveyId: survey.id,
        surveyTitle: survey.title,
        message: 'La oportunidad se marcó como ganada. Configura FRONTEND_URL para generar el enlace de encuesta.',
      }
    }
    try {
      const invitation = await manager.save(
        manager.create(CrmSurveyInvitation, {
          survey,
          opportunity,
          contact: opportunity.contact ?? null,
          client: opportunity.client,
          createdBy: this.actorRef(user),
          trigger: survey.trigger,
          tokenHash: token.hash,
          expiresAt: invitationExpiry(),
          usedAt: null,
          revokedAt: null,
        }),
      )
      this.logger.log(`Usuario ${user.id} generó una invitación de encuesta para la oportunidad ${opportunity.id}`)
      return {
        created: true as const,
        surveyId: survey.id,
        surveyTitle: survey.title,
        responseUrl: buildPublicSurveyUrl(frontend, token.raw),
        expiresAt: this.iso(invitation.expiresAt),
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          created: false as const,
          surveyId: survey.id,
          surveyTitle: survey.title,
          message: ACTIVE_INVITATION_EXISTS,
        }
      }
      this.logger.error(
        `No se pudo generar la invitación automática para la oportunidad ${opportunity.id}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  private async lockOpportunity(manager: EntityManager, id: string) {
    const locked = await manager
      .createQueryBuilder(CrmOpportunity, 'opportunity')
      .setLock('pessimistic_write')
      .where('opportunity.id = :id', { id })
      .getOne()
    if (!locked) throw new NotFoundException('Oportunidad no encontrada')
    const opportunity = await manager.findOne(CrmOpportunity, {
      where: { id },
      relations: { client: true, contact: true, owner: true },
    })
    if (!opportunity) throw new NotFoundException('Oportunidad no encontrada')
    return opportunity
  }

  private async lockInvitation(manager: EntityManager, opportunityId: string, surveyId: string) {
    return manager
      .createQueryBuilder(CrmSurveyInvitation, 'invitation')
      .setLock('pessimistic_write')
      .where('invitation.opportunity_id = :opportunityId', { opportunityId })
      .andWhere('invitation.survey_id = :surveyId', { surveyId })
      .getOne()
  }

  private actorRef(user: User): User {
    return { id: user.id } as User
  }

  private iso(value: Date | string) {
    return new Date(value).toISOString()
  }

  private async resolveSurveyForInvitation(manager: EntityManager, opportunity: CrmOpportunity, surveyId?: string) {
    if (surveyId) {
      const survey = await manager.findOne(CrmSurvey, { where: { id: surveyId } })
      if (!survey) throw new NotFoundException('Encuesta no encontrada')
      if (survey.status !== SurveyStatus.PUBLISHED) {
        throw new UnprocessableEntityException('La encuesta no está activa')
      }
      if (survey.trigger === SurveyTrigger.OPPORTUNITY_WON && opportunity.stage !== OpportunityStage.WON) {
        throw new UnprocessableEntityException('La encuesta de oportunidad ganada sólo se genera cuando la oportunidad está ganada')
      }
      if (survey.trigger === SurveyTrigger.MANUAL || isAutomaticSurveyTrigger(survey.trigger)) return survey
      throw new UnprocessableEntityException('El disparador de la encuesta no admite invitaciones')
    }
    if (opportunity.stage !== OpportunityStage.WON) {
      throw new UnprocessableEntityException('Selecciona una encuesta manual activa')
    }
    const survey = await manager.findOne(CrmSurvey, {
      where: { status: SurveyStatus.PUBLISHED, trigger: SurveyTrigger.OPPORTUNITY_WON },
    })
    if (!survey) throw new UnprocessableEntityException(WON_WITHOUT_ACTIVE_SURVEY)
    return survey
  }

  private publicUrl(raw: string) {
    const frontend = this.config.get<string>('FRONTEND_URL')
    if (!frontend) throw new UnprocessableEntityException('FRONTEND_URL no está configurada')
    return buildPublicSurveyUrl(frontend, raw)
  }

  private async find(id: string) {
    const opportunity = await this.opportunities.findOne({ where: { id }, relations: { client: true, contact: true, owner: true } })
    if (!opportunity) throw new NotFoundException('Oportunidad no encontrada')
    return opportunity
  }
}
