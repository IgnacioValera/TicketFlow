import { describe, expect, it } from 'vitest'
import { isHexColor, normalizeHexColor } from '@/utils/color'
import { getErrorMessages } from '@/utils/errors'

describe('Errores de API', () => {
  it('traduce el mensaje hexadecimal de class-validator', () => {
    expect(getErrorMessages({ message: 'color must be a hexadecimal color' }, 'Error')).toEqual([
      'El color debe tener formato hexadecimal, por ejemplo #2563EB.',
    ])
  })

  it('traduce mensajes de enum de nivel', () => {
    expect(getErrorMessages({ message: 'level must be a valid enum value' }, 'Error')).toEqual([
      'Selecciona un nivel de prioridad válido.',
    ])
  })

  it('muestra cada mensaje de un arreglo', () => {
    expect(
      getErrorMessages({ message: ['El nombre es obligatorio', 'color must be a hexadecimal color'] }, 'Error'),
    ).toEqual(['El nombre es obligatorio', 'El color debe tener formato hexadecimal, por ejemplo #2563EB.'])
  })
})

describe('Color hexadecimal', () => {
  it('acepta #RRGGBB y lo normaliza a mayúsculas', () => {
    expect(isHexColor('#2563d9')).toBe(true)
    expect(normalizeHexColor(' #2563d9 ')).toBe('#2563D9')
  })

  it('rechaza nombres CSS y RGB', () => {
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor('rgb(37, 99, 217)')).toBe(false)
    expect(isHexColor('var(--color-primary)')).toBe(false)
  })
})
