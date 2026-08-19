import { BadRequestException, ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common'
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
import { CreateQuestionDto, CreateSurveyDto, ReorderQuestionsDto, RespondSurveyDto, SurveysQueryDto, UpdateSurveyDto } from './dto'
import { calculateNps } from './nps'
import {
  assertAnswer,
  assertCanClose,
  assertCanEditSurvey,
  assertCanPublish,
  assertQuestion,
  defaultQuestionOptions,
  isEmptyAnswer,
  optionBreakdown,
  ratingBreakdown,
} from './survey-rules'
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
    const qb = this.surveys
      .createQueryBuilder('survey')
      .leftJoinAndSelect('survey.createdBy', 'createdBy')
      .loadRelationCountAndMap('survey.questionCount', 'survey.questions')
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
    assertCanEditSurvey(survey.status)
    if (dto.title) survey.title = dto.title.trim()
    if (dto.description !== undefined) survey.description = dto.description.trim()
    if (dto.trigger) survey.trigger = dto.trigger
    await this.surveys.save(survey)
    return this.serialize(await this.find(id, true))
  }

  async publish(id: string) {
    const survey = await this.find(id, true)
    assertCanPublish(survey.status, survey.questions?.length ?? 0)
    survey.status = SurveyStatus.PUBLISHED
    await this.surveys.save(survey)
    return this.serialize(await this.find(id, true))
  }

  async close(id: string) {
    const survey = await this.find(id)
    assertCanClose(survey.status)
    survey.status = SurveyStatus.CLOSED
    await this.surveys.save(survey)
    return this.serialize(await this.find(id, true))
  }

  async addQuestion(surveyId: string, dto: CreateQuestionDto) {
    const survey = await this.find(surveyId, true)
    assertCanEditSurvey(survey.status)
    const options = defaultQuestionOptions(dto.type, dto.options)
    assertQuestion({ type: dto.type, options })
    const position = dto.position ?? (survey.questions?.length ?? 0)
    const question = await this.questions.save(this.questions.create({
      survey, prompt: dto.prompt.trim(), type: dto.type, required: dto.required ?? true, position,
    }))
    for (const [index, option] of options.entries()) {
      await this.options.save(this.options.create({
        question, label: option.label.trim(), value: option.value?.trim() || option.label.trim(), position: index,
      }))
    }
    return this.serialize(await this.find(surveyId, true))
  }

  async removeQuestion(surveyId: string, questionId: string) {
    const survey = await this.find(surveyId)
    assertCanEditSurvey(survey.status)
    const question = await this.questions.findOne({ where: { id: questionId, survey: { id: surveyId } } })
    if (!question) throw new NotFoundException('Pregunta no encontrada')
    await this.questions.remove(question)
    return this.serialize(await this.find(surveyId, true))
  }

  async reorderQuestions(surveyId: string, dto: ReorderQuestionsDto) {
    const survey = await this.find(surveyId, true)
    assertCanEditSurvey(survey.status)
    const current = survey.questions ?? []
    const unique = new Set(dto.questionIds)
    if (unique.size !== current.length || current.some((question) => !unique.has(question.id))) {
      throw new BadRequestException('El orden debe incluir todas las preguntas de la encuesta')
    }
    for (const [index, questionId] of dto.questionIds.entries()) {
      await this.questions.update(questionId, { position: index })
    }
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
    const validated: Array<{ question: CrmSurveyQuestion; answer: RespondSurveyDto['answers'][number] }> = []
    for (const question of questions) {
      const answer = byId.get(question.id)
      if (question.required && isEmptyAnswer(answer)) {
        throw new BadRequestException(`Falta responder: ${question.prompt}`)
      }
      if (!answer || isEmptyAnswer(answer)) continue
      assertAnswer(question, answer)
      validated.push({ question, answer })
    }
    const npsAnswer = validated.find((item) => item.question.type === SurveyQuestionType.NPS)?.answer
    await this.responses.manager.transaction(async (em) => {
      const claimed = await em
        .createQueryBuilder()
        .update(CrmSurveyInvitation)
        .set({ usedAt: new Date() })
        .where('id = :id AND used_at IS NULL', { id: invitation.id })
        .execute()
      if (!claimed.affected) throw new ConflictException('La encuesta ya fue respondida')
      const response = await em.save(CrmSurveyResponse, em.create(CrmSurveyResponse, {
        invitation, survey, npsScore: npsAnswer?.numberValue ?? null,
      }))
      for (const item of validated) {
        await em.save(CrmSurveyAnswer, em.create(CrmSurveyAnswer, {
          response,
          question: item.question,
          textValue: item.answer.textValue?.trim() ?? null,
          numberValue: item.answer.numberValue ?? null,
          optionIds: item.answer.optionIds ?? null,
        }))
      }
    })
    return { submitted: true }
  }

  async results(id: string) {
    const survey = await this.find(id, true)
    const responses = await this.responses.find({ where: { survey: { id } }, relations: { answers: { question: true } } })
    const npsScores = responses.map((item) => item.npsScore).filter((score): score is number => score !== null)
    const hasNpsQuestion = (survey.questions ?? []).some((question) => question.type === SurveyQuestionType.NPS)
    return {
      survey: this.serialize(survey),
      totalResponses: responses.length,
      nps: hasNpsQuestion ? calculateNps(npsScores) : null,
      questions: (survey.questions ?? []).sort((a, b) => a.position - b.position).map((question) => {
        const answers = responses.flatMap((response) => response.answers ?? []).filter((answer) => answer.question.id === question.id)
        const mapped = answers.map((answer) => ({ textValue: answer.textValue, numberValue: answer.numberValue, optionIds: answer.optionIds }))
        const choice = question.type === SurveyQuestionType.SINGLE_CHOICE
          || question.type === SurveyQuestionType.MULTIPLE_CHOICE
          || question.type === SurveyQuestionType.YES_NO
        return {
          id: question.id,
          prompt: question.prompt,
          type: question.type,
          required: question.required,
          answerCount: answers.length,
          options: choice
            ? optionBreakdown(
              (question.options ?? []).sort((a, b) => a.position - b.position),
              mapped,
            )
            : undefined,
          ratings: question.type === SurveyQuestionType.RATING
            ? ratingBreakdown(mapped, 1, 5)
            : question.type === SurveyQuestionType.NPS
              ? ratingBreakdown(mapped, 0, 10)
              : undefined,
          texts: question.type === SurveyQuestionType.TEXT
            ? mapped.map((answer) => answer.textValue?.trim()).filter((value): value is string => Boolean(value))
            : undefined,
        }
      }),
    }
  }

  serialize(survey: CrmSurvey & { questionCount?: number }) {
    return {
      id: survey.id, title: survey.title, description: survey.description, status: survey.status, trigger: survey.trigger,
      createdById: survey.createdBy?.id, createdByName: survey.createdBy?.fullName,
      createdAt: survey.createdAt.toISOString(), updatedAt: survey.updatedAt.toISOString(),
      questionCount: survey.questionCount ?? survey.questions?.length ?? 0,
      questions: (survey.questions ?? []).sort((a, b) => a.position - b.position).map((question) => ({
        id: question.id, prompt: question.prompt, type: question.type, required: question.required, position: question.position,
        options: (question.options ?? []).sort((a, b) => a.position - b.position).map((option) => ({ id: option.id, label: option.label, value: option.value })),
      })),
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
