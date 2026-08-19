import { describe, expect, it } from 'vitest'
import { buildPriorityPayload, validatePriorityForm } from '@/utils/priority-form'

describe('validatePriorityForm', () => {
  const valid = {
    name: 'Urgente operaciones',
    level: 'HIGH' as const,
    color: '#2563EB',
    description: 'Prioridad para incidentes críticos',
  }

  it('acepta un formulario válido', () => {
    expect(validatePriorityForm(valid)).toBeNull()
  })

  it('rechaza nombre corto o solo espacios', () => {
    expect(validatePriorityForm({ ...valid, name: 'a' })).toMatch(/al menos 2/i)
    expect(validatePriorityForm({ ...valid, name: '   ' })).toMatch(/obligatorio/i)
  })

  it('rechaza color inválido', () => {
    expect(validatePriorityForm({ ...valid, color: 'red' })).toMatch(/hexadecimal/i)
    expect(validatePriorityForm({ ...valid, color: '#GGG' })).toMatch(/hexadecimal/i)
  })

  it('permite descripción vacía', () => {
    expect(validatePriorityForm({ ...valid, description: '' })).toBeNull()
  })
})

describe('buildPriorityPayload', () => {
  it('normaliza color y omite descripción vacía', () => {
    const payload = buildPriorityPayload({
      name: '  Media plus  ',
      level: 'MEDIUM',
      color: ' #0f766e ',
      description: '',
    })

    expect(payload).toEqual({
      name: 'Media plus',
      level: 'MEDIUM',
      color: '#0F766E',
    })
    expect(payload).not.toHaveProperty('description')
  })

  it('incluye descripción cuando tiene contenido', () => {
    const payload = buildPriorityPayload({
      name: 'Alta',
      level: 'HIGH',
      color: '#DC2626',
      description: '  Detalle relevante  ',
    })

    expect(payload.description).toBe('Detalle relevante')
  })
})
