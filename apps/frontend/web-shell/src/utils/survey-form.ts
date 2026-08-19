import { LIMITS } from '@/constants/validation'
import type { CrmSurveyQuestion, SurveyQuestionType, SurveyTrigger } from '@/types/crm.types'
import { maxLengthAfterTrim, requiredTrimmed } from '@/utils/validation'

export const EMPTY_SURVEY_FORM = {
  title: '',
  description: '',
  trigger: 'MANUAL' as SurveyTrigger,
}

export const EMPTY_QUESTION_FORM = {
  prompt: '',
  type: 'TEXT' as SurveyQuestionType,
  required: true,
  options: '',
}

export function surveyTitleError(title: string) {
  return requiredTrimmed(title, 'El título') || maxLengthAfterTrim(title, 'El título', LIMITS.SURVEY_TITLE)
}

export function surveyDescriptionError(description: string) {
  return maxLengthAfterTrim(description, 'La descripción', LIMITS.SURVEY_DESCRIPTION)
}

export function questionPromptError(prompt: string) {
  return requiredTrimmed(prompt, 'La pregunta') || maxLengthAfterTrim(prompt, 'La pregunta', LIMITS.SURVEY_PROMPT)
}

export function parseOptionLines(raw: string) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function questionOptionsError(type: SurveyQuestionType, raw: string) {
  if (type !== 'SINGLE_CHOICE' && type !== 'MULTIPLE_CHOICE') return null
  if (parseOptionLines(raw).length < 2) return 'Agrega al menos dos opciones, una por línea'
  return null
}

export function defaultOptionsForType(type: SurveyQuestionType) {
  return type === 'YES_NO' ? 'Sí\nNo' : ''
}

export function isEmptyPublicAnswer(answer?: { textValue?: string; numberValue?: number; optionIds?: string[] }) {
  if (!answer) return true
  return !answer.textValue?.trim() && answer.numberValue === undefined && !(answer.optionIds?.length)
}

export function publicAnswersError(
  questions: CrmSurveyQuestion[],
  answers: Record<string, { textValue?: string; numberValue?: number; optionIds?: string[] }>,
) {
  for (const question of questions) {
    if (!question.required) continue
    if (isEmptyPublicAnswer(answers[question.id])) return `Falta responder: ${question.prompt}`
    if (question.type === 'MULTIPLE_CHOICE' && !(answers[question.id]?.optionIds?.length)) {
      return `Selecciona al menos una opción en: ${question.prompt}`
    }
  }
  return null
}

export function optionBreakdown(
  options: Array<{ id: string; label: string; value: string }>,
  answers: Array<{ optionIds?: string[] | null }>,
) {
  const total = answers.length
  return options.map((option) => {
    const count = answers.filter((answer) => answer.optionIds?.includes(option.id)).length
    return {
      ...option,
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
