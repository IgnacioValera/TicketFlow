import { BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { SurveyQuestionType, SurveyStatus } from '../database/entities'

export const YES_NO_OPTIONS = [
  { label: 'Sí', value: 'yes' },
  { label: 'No', value: 'no' },
] as const

export type SurveyOptionLike = { id?: string; label: string; value?: string }
export type SurveyQuestionLike = {
  id: string
  prompt: string
  type: SurveyQuestionType
  required: boolean
  options?: Array<{ id: string; label: string; value: string }>
}
export type SurveyAnswerLike = {
  questionId: string
  textValue?: string
  numberValue?: number
  optionIds?: string[]
}

export function isEmptyAnswer(answer?: SurveyAnswerLike | null) {
  if (!answer) return true
  return !answer.textValue?.trim() && answer.numberValue === undefined && !(answer.optionIds?.length)
}

export function defaultQuestionOptions(type: SurveyQuestionType, options?: SurveyOptionLike[]) {
  if (type === SurveyQuestionType.YES_NO && !(options?.length)) {
    return YES_NO_OPTIONS.map((option) => ({ ...option }))
  }
  return options ?? []
}

export function assertQuestion(dto: { type: SurveyQuestionType; options?: SurveyOptionLike[] }) {
  const options = defaultQuestionOptions(dto.type, dto.options)
  if (dto.type === SurveyQuestionType.SINGLE_CHOICE || dto.type === SurveyQuestionType.MULTIPLE_CHOICE) {
    if (options.length < 2) {
      throw new BadRequestException('Las preguntas de opción requieren al menos dos alternativas')
    }
  }
  if (dto.type === SurveyQuestionType.YES_NO && options.length < 2) {
    throw new BadRequestException('Las preguntas de sí o no requieren las opciones Sí y No')
  }
}

export function assertCanEditSurvey(status: SurveyStatus) {
  if (status !== SurveyStatus.DRAFT) {
    throw new UnprocessableEntityException('Sólo se editan encuestas en borrador')
  }
}

export function assertCanPublish(status: SurveyStatus, questionCount: number) {
  if (status === SurveyStatus.PUBLISHED) {
    throw new UnprocessableEntityException('La encuesta ya está activa')
  }
  if (questionCount < 1) {
    throw new UnprocessableEntityException('Agrega al menos una pregunta para publicar')
  }
}

export function assertCanClose(status: SurveyStatus) {
  if (status !== SurveyStatus.PUBLISHED) {
    throw new UnprocessableEntityException('Sólo se desactivan encuestas publicadas')
  }
}

export function assertAnswer(question: SurveyQuestionLike, answer: SurveyAnswerLike) {
  const optionIds = (question.options ?? []).map((option) => option.id)
  if (question.type === SurveyQuestionType.NPS) {
    if (answer.numberValue === undefined || answer.numberValue < 0 || answer.numberValue > 10) {
      throw new BadRequestException('NPS debe estar entre 0 y 10')
    }
  }
  if (question.type === SurveyQuestionType.RATING) {
    if (answer.numberValue === undefined || answer.numberValue < 1 || answer.numberValue > 5) {
      throw new BadRequestException('La calificación debe estar entre 1 y 5')
    }
  }
  if (question.type === SurveyQuestionType.TEXT && !answer.textValue?.trim() && question.required) {
    throw new BadRequestException('La respuesta de texto es obligatoria')
  }
  if (question.type === SurveyQuestionType.SINGLE_CHOICE || question.type === SurveyQuestionType.YES_NO) {
    if (!(answer.optionIds?.length === 1) || !optionIds.includes(answer.optionIds[0])) {
      throw new BadRequestException(`Selecciona una opción en: ${question.prompt}`)
    }
  }
  if (question.type === SurveyQuestionType.MULTIPLE_CHOICE) {
    const selected = answer.optionIds ?? []
    if (question.required && !selected.length) {
      throw new BadRequestException(`Selecciona al menos una opción en: ${question.prompt}`)
    }
    if (selected.some((id) => !optionIds.includes(id))) {
      throw new BadRequestException(`Hay una opción inválida en: ${question.prompt}`)
    }
  }
}

export function optionBreakdown(
  options: Array<{ id: string; label: string; value: string }>,
  answers: Array<{ optionIds?: string[] | null }>,
) {
  const total = answers.length
  return options.map((option) => {
    const count = answers.filter((answer) => answer.optionIds?.includes(option.id)).length
    return {
      id: option.id,
      label: option.label,
      value: option.value,
      count,
      percentage: total ? Math.round((count / total) * 100) : 0,
    }
  })
}

export function ratingBreakdown(answers: Array<{ numberValue?: number | null }>, min: number, max: number) {
  const total = answers.length
  const values: Array<{ value: number; count: number; percentage: number }> = []
  for (let value = min; value <= max; value += 1) {
    const count = answers.filter((answer) => answer.numberValue === value).length
    values.push({ value, count, percentage: total ? Math.round((count / total) * 100) : 0 })
  }
  return values
}
