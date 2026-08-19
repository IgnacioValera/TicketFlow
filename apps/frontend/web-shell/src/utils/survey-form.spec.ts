import { describe, expect, it } from 'vitest'
import {
  defaultOptionsForType,
  optionBreakdown,
  publicAnswersError,
  questionOptionsError,
  surveyTitleError,
} from '@/utils/survey-form'

describe('Validación de encuestas', () => {
  it('exige título con contenido', () => {
    expect(surveyTitleError('   ')).toMatch(/obligatorio/i)
    expect(surveyTitleError('Satisfacción post-venta')).toBeNull()
  })

  it('exige al menos dos opciones en preguntas de opción', () => {
    expect(questionOptionsError('SINGLE_CHOICE', 'Sólo una')).toMatch(/dos opciones/i)
    expect(questionOptionsError('MULTIPLE_CHOICE', 'A\nB')).toBeNull()
    expect(questionOptionsError('TEXT', '')).toBeNull()
  })

  it('prellena Sí y No', () => {
    expect(defaultOptionsForType('YES_NO')).toBe('Sí\nNo')
  })

  it('calcula porcentajes con las respuestas guardadas', () => {
    const result = optionBreakdown(
      [
        { id: 'yes', label: 'Sí', value: 'yes' },
        { id: 'no', label: 'No', value: 'no' },
      ],
      [{ optionIds: ['yes'] }, { optionIds: ['yes'] }, { optionIds: ['no'] }],
    )
    expect(result[0]).toMatchObject({ count: 2, percentage: 67 })
    expect(result[1]).toMatchObject({ count: 1, percentage: 33 })
  })

  it('exige las preguntas obligatorias antes de enviar', () => {
    expect(
      publicAnswersError(
        [{ id: 'q1', prompt: '¿Nos recomendarías?', type: 'NPS', required: true, position: 0, options: [] }],
        {},
      ),
    ).toMatch(/Falta responder/i)
  })
})
