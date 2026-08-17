import { BadRequestException, ConflictException, GoneException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { pagination, parsePagination } from '../common/api'
import {
  CrmSurvey,
  CrmSurveyAnswer,
  CrmSurveyInvitation,
  CrmSurveyQuestion,
  CrmSurveyQuestionOption,
  CrmSurveyResponse,
  SurveyQuestionType,
  SurveyStatus,
  SurveyTrigger,
  User,
} from '../database/entities'
import { CreateQuestionDto, CreateSurveyDto, RespondSurveyDto, SurveysQueryDto, UpdateSurveyDto } from './dto'
import { calculateNps } from './nps'
import { hashSurveyToken } from './survey-token'

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(CrmSurvey) private readonly surveys: Repository<CrmSurvey>,
    @InjectRepository(CrmSurveyQuestion) private readonly questions: Repository<CrmSurveyQuestion>,
    @InjectRepository(CrmSurveyQuestionOption) private readonly options: Repository<CrmSurveyQuestionOption>,
    @InjectRepository(CrmSurveyInvitation) private readonly invitations: Repository<CrmSurveyInvitation>,
    @InjectRepository(CrmSurveyResponse) private readonly responses: Repository<CrmSurveyResponse>,
    @InjectRepository(CrmSurveyAnswer) private readonly answers: Repository<CrmSurveyAnswer>,
  ) {}

  async getById(id: string) {
    return this.serialize(await this.find(id, true))
  }

  async list(query: SurveysQueryDto) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage)
    const qb = this.surveys.createQueryBuilder('survey').leftJoinAndSelect('survey.createdBy', 'createdBy')
    if (query.status) qb.andWhere('survey.status = :status', { status: query.status })
    if (query.search) qb.andWhere('LOWER(survey.title) LIKE :q', { q: `%${query.search.toLowerCase()}%` })
    const [items, total] = await qb.orderBy('survey.updatedAt', 'DESC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((item) => this.serialize(item)), meta: pagination(page, perPage, total) }
  }

  async create(dto: CreateSurveyDto, user: User) {
    const survey = await this.surveys.save(this.surveys.create({
      title: dto.title.trim(), description: dto.description?.trim() ?? '', trigger: dto.trigger ?? SurveyTrigger.MANUAL, status: SurveyStatus.DRAFT, createdBy: user,
    }))
    return this.serialize(await this.find(survey.id))
  }

  async update(id: string, dto: UpdateSurveyDto) {
    const survey = await this.find(id)
    if (survey.status !== SurveyStatus.DRAFT) throw new UnprocessableEntityException('Sólo se editan encuestas en borrador')
    if (dto.title) survey.title = dto.title.trim()
    if (dto.description !== undefined) survey.description = dto.description.trim()
    if (dto.trigger) survey.trigger = dto.trigger
    await this.surveys.save(survey)
    return this.serialize(await this.find(id))
  }

  async publish(id: string) {
    const survey = await this.find(id, true)
    if (!survey.questions?.length) throw new UnprocessableEntityException('Publica al menos una pregunta')
    survey.status = SurveyStatus.PUBLISHED
    await this.surveys.save(survey)
    return this.serialize(await this.find(id, true))
  }

  async close(id: string) {
    const survey = await this.find(id)
    survey.status = SurveyStatus.CLOSED
    await this.surveys.save(survey)
    return this.serialize(await this.find(id))
  }

  async addQuestion(surveyId: string, dto: CreateQuestionDto) {
    const survey = await this.find(surveyId, true)
    if (survey.status !== SurveyStatus.DRAFT) throw new UnprocessableEntityException('No se pueden agregar preguntas a una encuesta publicada')
    this.assertQuestion(dto)
    const position = dto.position ?? (survey.questions?.length ?? 0)
    const question = await this.questions.save(this.questions.create({
      survey, prompt: dto.prompt.trim(), type: dto.type, required: dto.required ?? true, position,
    }))
    for (const [index, option] of (dto.options ?? []).entries()) {
      await this.options.save(this.options.create({ question, label: option.label.trim(), value: option.value?.trim() || option.label.trim(), position: index }))
    }
    return this.serialize(await this.find(surveyId, true))
  }

  async removeQuestion(surveyId: string, questionId: string) {
    const survey = await this.find(surveyId)
    if (survey.status !== SurveyStatus.DRAFT) throw new UnprocessableEntityException('No se pueden quitar preguntas de una encuesta publicada')
    const question = await this.questions.findOne({ where: { id: questionId, survey: { id: surveyId } } })
    if (!question) throw new NotFoundException('Pregunta no encontrada')
    await this.questions.remove(question)
    return this.serialize(await this.find(surveyId, true))
  }

  async publicForm(token: string) {
    const invitation = await this.findInvitation(token)
    const survey = await this.find(invitation.survey.id, true)
    return {
      surveyId: survey.id,
      title: survey.title,
      description: survey.description,
      questions: (survey.questions ?? []).sort((a, b) => a.position - b.position).map((question) => ({
        id: question.id, prompt: question.prompt, type: question.type, required: question.required,
        options: (question.options ?? []).sort((a, b) => a.position - b.position).map((option) => ({ id: option.id, label: option.label, value: option.value })),
      })),
    }
  }

  async respond(token: string, dto: RespondSurveyDto) {
    const invitation = await this.findInvitation(token)
    const survey = await this.find(invitation.survey.id, true)
    const questions = (survey.questions ?? []).sort((a, b) => a.position - b.position)
    const byId = new Map(dto.answers.map((answer) => [answer.questionId, answer]))
    for (const question of questions) {
      const answer = byId.get(question.id)
      if (question.required && !answer) throw new BadRequestException(`Falta responder: ${question.prompt}`)
      if (answer) this.assertAnswer(question, answer)
    }
    const npsAnswer = dto.answers.find((answer) => questions.find((question) => question.id === answer.questionId)?.type === SurveyQuestionType.NPS)
    const response = await this.responses.save(this.responses.create({
      invitation, survey, npsScore: npsAnswer?.numberValue ?? null,
    }))
    for (const answer of dto.answers) {
      const question = questions.find((item) => item.id === answer.questionId)
      if (!question) continue
      await this.answers.save(this.answers.create({
        response, question, textValue: answer.textValue?.trim() ?? null, numberValue: answer.numberValue ?? null, optionIds: answer.optionIds ?? null,
      }))
    }
    invitation.usedAt = new Date()
    await this.invitations.save(invitation)
    return { id: response.id, submittedAt: response.submittedAt.toISOString() }
  }

  async results(id: string) {
    const survey = await this.find(id, true)
    const responses = await this.responses.find({ where: { survey: { id } }, relations: { answers: { question: true } } })
    const npsScores = responses.map((item) => item.npsScore).filter((score): score is number => score !== null)
    return {
      survey: this.serialize(survey),
      totalResponses: responses.length,
      nps: calculateNps(npsScores),
      questions: (survey.questions ?? []).sort((a, b) => a.position - b.position).map((question) => {
        const answers = responses.flatMap((response) => response.answers ?? []).filter((answer) => answer.question.id === question.id)
        return {
          id: question.id, prompt: question.prompt, type: question.type,
          answers: answers.map((answer) => ({ textValue: answer.textValue, numberValue: answer.numberValue, optionIds: answer.optionIds })),
        }
      }),
    }
  }

  serialize(survey: CrmSurvey) {
    return {
      id: survey.id, title: survey.title, description: survey.description, status: survey.status, trigger: survey.trigger,
      createdById: survey.createdBy?.id, createdByName: survey.createdBy?.fullName,
      createdAt: survey.createdAt.toISOString(), updatedAt: survey.updatedAt.toISOString(),
      questions: (survey.questions ?? []).sort((a, b) => a.position - b.position).map((question) => ({
        id: question.id, prompt: question.prompt, type: question.type, required: question.required, position: question.position,
        options: (question.options ?? []).sort((a, b) => a.position - b.position).map((option) => ({ id: option.id, label: option.label, value: option.value })),
      })),
    }
  }

  private assertQuestion(dto: CreateQuestionDto) {
    if ((dto.type === SurveyQuestionType.SINGLE_CHOICE || dto.type === SurveyQuestionType.MULTIPLE_CHOICE) && !(dto.options?.length)) {
      throw new BadRequestException('Las preguntas de opción requieren alternativas')
    }
  }

  private assertAnswer(question: CrmSurveyQuestion, answer: RespondSurveyDto['answers'][number]) {
    if (question.type === SurveyQuestionType.NPS) {
      if (answer.numberValue === undefined || answer.numberValue < 0 || answer.numberValue > 10) throw new BadRequestException('NPS debe estar entre 0 y 10')
    }
    if (question.type === SurveyQuestionType.RATING) {
      if (answer.numberValue === undefined || answer.numberValue < 1 || answer.numberValue > 5) throw new BadRequestException('La calificación debe estar entre 1 y 5')
    }
    if (question.type === SurveyQuestionType.TEXT && !answer.textValue?.trim() && question.required) throw new BadRequestException('La respuesta de texto es obligatoria')
    if (question.type === SurveyQuestionType.YES_NO && !answer.optionIds?.length && answer.numberValue === undefined && !answer.textValue) {
      throw new BadRequestException('Responde sí o no')
    }
  }

  private async findInvitation(token: string) {
    const invitation = await this.invitations.findOne({ where: { tokenHash: hashSurveyToken(token) }, relations: { survey: true } })
    if (!invitation) throw new NotFoundException('Enlace de encuesta inválido')
    if (invitation.usedAt) throw new ConflictException('La encuesta ya fue respondida')
    if (invitation.expiresAt.getTime() < Date.now()) throw new GoneException('El enlace de encuesta expiró')
    if (invitation.survey.status !== SurveyStatus.PUBLISHED) throw new GoneException('La encuesta ya no está disponible')
    return invitation
  }

  private async find(id: string, withQuestions = false) {
    const survey = await this.surveys.findOne({
      where: { id },
      relations: withQuestions ? { createdBy: true, questions: { options: true } } : { createdBy: true },
    })
    if (!survey) throw new NotFoundException('Encuesta no encontrada')
    return survey
  }
}
