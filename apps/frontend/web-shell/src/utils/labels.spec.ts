import { describe, expect, it } from 'vitest'
import {
  getActivityStatusLabel,
  getActivityTypeLabel,
  getClientStatusLabel,
  getClientTierLabel,
  getOpportunityStageLabel,
  getSurveyQuestionTypeLabel,
  getSurveyStatusLabel,
} from '@/utils/labels'

describe('Etiquetas CRM', () => {
  it('traduce tipos de actividad', () => {
    expect(getActivityTypeLabel('CALL')).toBe('Llamada')
    expect(getActivityTypeLabel('MEETING')).toBe('Reunión')
    expect(getActivityTypeLabel('TASK')).toBe('Tarea')
    expect(getActivityTypeLabel('NOTE')).toBe('Nota')
  })

  it('traduce etapas de oportunidad', () => {
    expect(getOpportunityStageLabel('NEW')).toBe('Nueva')
    expect(getOpportunityStageLabel('WON')).toBe('Ganada')
    expect(getOpportunityStageLabel('LOST')).toBe('Perdida')
  })

  it('traduce estados de cliente, encuesta y actividad', () => {
    expect(getClientStatusLabel('PROSPECT')).toBe('Prospecto')
    expect(getClientTierLabel('GOLD')).toBe('Oro')
    expect(getSurveyStatusLabel('DRAFT')).toBe('Borrador')
    expect(getActivityStatusLabel('PENDING')).toBe('Pendiente')
    expect(getSurveyQuestionTypeLabel('RATING')).toBe('Escala')
  })
})
