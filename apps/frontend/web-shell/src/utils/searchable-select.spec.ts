import { describe, expect, it } from 'vitest'
import { filterSelectOptions, moveSelectIndex, placeSelectMenu } from '@/utils/searchable-select'

const options = [
  { value: 'c1', label: 'Acme Corp', description: 'Finanzas' },
  { value: 'c2', label: 'Globex', description: 'Tecnología' },
  { value: 'c3', label: 'Initech' },
]

describe('filterSelectOptions', () => {
  it('devuelve todas las opciones si la búsqueda está vacía', () => {
    expect(filterSelectOptions(options, '  ')).toHaveLength(3)
  })

  it('filtra por nombre o descripción, sin importar mayúsculas', () => {
    expect(filterSelectOptions(options, 'acme').map((item) => item.value)).toEqual(['c1'])
    expect(filterSelectOptions(options, 'TECNO').map((item) => item.value)).toEqual(['c2'])
  })

  it('no devuelve coincidencias si no hay match', () => {
    expect(filterSelectOptions(options, 'sin coincidencias')).toHaveLength(0)
  })
})

describe('moveSelectIndex', () => {
  it('avanza y recorre la lista en ciclo', () => {
    expect(moveSelectIndex(0, 1, 3)).toBe(1)
    expect(moveSelectIndex(2, 1, 3)).toBe(0)
    expect(moveSelectIndex(0, -1, 3)).toBe(2)
  })

  it('devuelve -1 si no hay opciones', () => {
    expect(moveSelectIndex(0, 1, 0)).toBe(-1)
  })
})

describe('placeSelectMenu', () => {
  it('abre hacia abajo cuando hay espacio suficiente', () => {
    const placed = placeSelectMenu({ top: 80, bottom: 120, left: 16, width: 240 }, 800)
    expect(placed.top).toBe(124)
    expect(placed.bottom).toBeUndefined()
    expect(placed.maxHeight).toBeLessThanOrEqual(256)
  })

  it('abre hacia arriba si el disparador está cerca del borde inferior', () => {
    const placed = placeSelectMenu({ top: 720, bottom: 760, left: 16, width: 240 }, 800)
    expect(placed.bottom).toBe(800 - 720 + 4)
    expect(placed.top).toBeUndefined()
  })

  it('respeta menuPlacement top aunque haya espacio abajo', () => {
    const placed = placeSelectMenu({ top: 200, bottom: 240, left: 16, width: 240 }, 800, 256, 'top')
    expect(placed.bottom).toBe(800 - 200 + 4)
    expect(placed.top).toBeUndefined()
  })
})
