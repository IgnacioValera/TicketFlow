import { BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { OpportunityStage, RoleCode, SurveyQuestionType, SurveyStatus } from '../database/entities'
import { clientAccessMode, canAccessClient } from './access'
import { isValidClientPhone, normalizeClientPhone } from './client-rules'
import { calculateNps, classifyNps } from './nps'
import { assertStageChange, probabilityForStage, stagesForStatus, summarizeOpportunities } from './opportunity-rules'
import { conversionRate, mapPipeline } from './dashboard-metrics'
import { calculateClientScore } from './score'
import { createSurveyToken, hashSurveyToken } from './survey-token'
import { isForeignKeyViolation, isUniqueViolation } from './db-errors'
import {
  assertAnswer,
  assertCanClose,
  assertCanPublish,
  assertQuestion,
  defaultQuestionOptions,
  optionBreakdown,
} from './survey-rules'

describe('Score CRM', () => {
  it('no inventa 50/100 cuando faltan datos', () => {
    const result = calculateClientScore({
      ticketRatings: [], crmNpsScores: [], wonCount: 0, lostCount: 0, completedActivities90d: 0,
      totalActivities: 0, closedTickets: 0, totalTickets: 0, ageDays: 0,
    })
    expect(result.score).toBeNull()
    expect(result.insufficient).toBe(true)
    expect(result.factors.every((factor) => !factor.hasData)).toBe(true)
  })

  it('pondera satisfacción, won y actividad y expone el desglose', () => {
    const result = calculateClientScore({
      ticketRatings: [5], crmNpsScores: [10], wonCount: 2, lostCount: 0, completedActivities90d: 8,
      totalActivities: 8, closedTickets: 4, totalTickets: 4, ageDays: 730,
    })
    expect(result.score).toBe(100)
    expect(result.insufficient).toBe(false)
    expect(result.factors.find((factor) => factor.key === 'satisfaction')?.points).toBe(30)
    expect(result.factors.find((factor) => factor.key === 'won')?.points).toBe(25)
  })
})

describe('Métricas del panel CRM', () => {
  it('calcula conversión sólo con oportunidades cerradas', () => {
    expect(conversionRate(0, 0)).toBe(0)
    expect(conversionRate(1, 1)).toBe(50)
    expect(conversionRate(3, 1)).toBe(75)
  })

  it('completa todas las etapas del embudo aunque no haya filas', () => {
    const pipeline = mapPipeline([{ stage: OpportunityStage.WON, count: '2', amount: '15000' }])
    expect(pipeline).toHaveLength(6)
    expect(pipeline.find((item) => item.stage === OpportunityStage.WON)).toEqual({
      stage: OpportunityStage.WON,
      count: 2,
      amount: 15000,
    })
    expect(pipeline.find((item) => item.stage === OpportunityStage.NEW)).toEqual({
      stage: OpportunityStage.NEW,
      count: 0,
      amount: 0,
    })
  })
})

describe('NPS', () => {
  it('calcula promotores menos detractores', () => {
    expect(classifyNps(10)).toBe('promoter')
    expect(classifyNps(7)).toBe('passive')
    expect(classifyNps(0)).toBe('detractor')
    expect(calculateNps([10, 9, 7, 6])).toEqual({ nps: 25, promoters: 2, passives: 1, detractors: 1, total: 4 })
  })
})

describe('Etapas de oportunidad', () => {
  it('exige motivo al perder', () => {
    expect(() => assertStageChange(OpportunityStage.PROPOSAL, OpportunityStage.LOST, {})).toThrow(BadRequestException)
  })

  it('bloquea WON sin reapertura', () => {
    expect(() => assertStageChange(OpportunityStage.WON, OpportunityStage.NEGOTIATION, {})).toThrow(UnprocessableEntityException)
  })

  it('permite reapertura con motivo', () => {
    expect(() => assertStageChange(OpportunityStage.LOST, OpportunityStage.NEW, { reopen: true, reopenReason: 'El cliente regresó' })).not.toThrow()
  })

  it('no reabre de una etapa terminal a otra terminal', () => {
    expect(() => assertStageChange(OpportunityStage.LOST, OpportunityStage.WON, { reopen: true, reopenReason: 'Cambio de criterio' })).toThrow(UnprocessableEntityException)
  })

  it('asigna probabilidad por etapa', () => {
    expect(probabilityForStage(OpportunityStage.WON, 10)).toBe(100)
    expect(probabilityForStage(OpportunityStage.LOST)).toBe(0)
    expect(probabilityForStage(OpportunityStage.PROPOSAL)).toBe(50)
  })

  it('filtra etapas abiertas, ganadas y perdidas', () => {
    expect(stagesForStatus('OPEN')).toEqual([
      OpportunityStage.NEW,
      OpportunityStage.QUALIFICATION,
      OpportunityStage.PROPOSAL,
      OpportunityStage.NEGOTIATION,
    ])
    expect(stagesForStatus('WON')).toEqual([OpportunityStage.WON])
    expect(stagesForStatus('LOST')).toEqual([OpportunityStage.LOST])
  })

  it('calcula totales sólo con los registros recibidos', () => {
    expect(
      summarizeOpportunities([
        { amount: 100, stage: OpportunityStage.PROPOSAL, probability: 50 },
        { amount: 40, stage: OpportunityStage.LOST, probability: 0 },
      ]),
    ).toEqual({ count: 2, amount: 140, weighted: 50 })
  })
})

describe('Tokens de encuesta', () => {
  it('hashea de forma determinista y no guarda el raw', () => {
    const token = createSurveyToken()
    expect(token.raw).toHaveLength(64)
    expect(token.hash).toBe(hashSurveyToken(token.raw))
    expect(token.hash).not.toBe(token.raw)
  })

  it('detecta violaciones de unicidad de PostgreSQL', () => {
    expect(isUniqueViolation(new Error('duplicate'))).toBe(false)
    expect(isUniqueViolation({ driverError: { code: '23505' } })).toBe(true)
    expect(isUniqueViolation({ code: '23503' })).toBe(false)
    expect(isForeignKeyViolation({ code: '23503' })).toBe(true)
    expect(isForeignKeyViolation({ driverError: { code: '23505' } })).toBe(false)
  })
})

describe('Reglas de encuestas CRM', () => {
  it('exige al menos dos opciones en preguntas de opción', () => {
    expect(() => assertQuestion({ type: SurveyQuestionType.SINGLE_CHOICE, options: [{ label: 'Sólo una' }] })).toThrow(BadRequestException)
    expect(() => assertQuestion({
      type: SurveyQuestionType.MULTIPLE_CHOICE,
      options: [{ label: 'A' }, { label: 'B' }],
    })).not.toThrow()
  })

  it('completa Sí y No cuando no se envían opciones', () => {
    expect(defaultQuestionOptions(SurveyQuestionType.YES_NO, [])).toEqual([
      { label: 'Sí', value: 'yes' },
      { label: 'No', value: 'no' },
    ])
  })

  it('bloquea publicar sin preguntas y desactivar si no está activa', () => {
    expect(() => assertCanPublish(SurveyStatus.DRAFT, 0)).toThrow(UnprocessableEntityException)
    expect(() => assertCanPublish(SurveyStatus.PUBLISHED, 2)).toThrow(UnprocessableEntityException)
    expect(() => assertCanClose(SurveyStatus.DRAFT)).toThrow(UnprocessableEntityException)
    expect(() => assertCanPublish(SurveyStatus.CLOSED, 1)).not.toThrow()
    expect(() => assertCanClose(SurveyStatus.PUBLISHED)).not.toThrow()
  })

  it('calcula porcentajes a partir de las respuestas almacenadas', () => {
    const breakdown = optionBreakdown(
      [
        { id: 'yes', label: 'Sí', value: 'yes' },
        { id: 'no', label: 'No', value: 'no' },
      ],
      [{ optionIds: ['yes'] }, { optionIds: ['yes'] }, { optionIds: ['no'] }],
    )
    expect(breakdown[0]).toMatchObject({ count: 2, percentage: 67 })
    expect(breakdown[1]).toMatchObject({ count: 1, percentage: 33 })
  })

  it('rechaza una opción que no pertenece a la pregunta', () => {
    expect(() => assertAnswer(
      {
        id: 'q1',
        prompt: '¿Volverías a contratar?',
        type: SurveyQuestionType.YES_NO,
        required: true,
        options: [{ id: 'yes', label: 'Sí', value: 'yes' }, { id: 'no', label: 'No', value: 'no' }],
      },
      { questionId: 'q1', optionIds: ['otro'] },
    )).toThrow(BadRequestException)
  })
})

describe('Alcance de cartera', () => {
  it('ADMIN ve todo y SALES sólo su cartera', () => {
    expect(clientAccessMode({ role: { code: RoleCode.ADMIN } } as never)).toBe('all')
    expect(clientAccessMode({ role: { code: RoleCode.SALES } } as never)).toBe('owner')
    expect(clientAccessMode({ role: { code: RoleCode.AGENT } } as never)).toBe('tickets')
    expect(clientAccessMode({ role: { code: RoleCode.CLIENT } } as never)).toBe('none')
  })

  it('niega 403 lógico a un agente sin tickets del cliente', () => {
    expect(canAccessClient({ role: { code: RoleCode.AGENT } } as never, { id: 'c1', owner: null }, [])).toBe(false)
    expect(canAccessClient({ role: { code: RoleCode.SALES } } as never, { id: 'c1', owner: { id: 'other' } }, [])).toBe(false)
  })
})

describe('Teléfono de cliente', () => {
  it('normaliza espacios y valida dígitos', () => {
    expect(normalizeClientPhone('777 111 2233')).toBe('7771112233')
    expect(isValidClientPhone('777 111 2233')).toBe(true)
    expect(isValidClientPhone('abc')).toBe(false)
    expect(isValidClientPhone('123')).toBe(false)
  })
})
