import { describe, expect, it } from 'vitest'
import { LIMITS } from '@/constants/validation'
import {
  validateAttachmentFile,
  validateDateRange,
  validatePasswordPolicy,
  validateSlaHours,
} from '@/utils/validation'

describe('Validación frontend', () => {
  it('rechaza contraseña sin mayúscula', () => {
    const result = validatePasswordPolicy('password1!')
    expect(result.ok).toBe(false)
  })

  it('rechaza contraseña sin minúscula', () => {
    const result = validatePasswordPolicy('PASSWORD1!')
    expect(result.ok).toBe(false)
  })

  it('rechaza contraseña sin número', () => {
    const result = validatePasswordPolicy('Password!')
    expect(result.ok).toBe(false)
  })

  it('rechaza contraseña sin símbolo', () => {
    const result = validatePasswordPolicy('Password1')
    expect(result.ok).toBe(false)
  })

  it('acepta una contraseña válida', () => {
    expect(validatePasswordPolicy('Password1!').ok).toBe(true)
  })

  it('no recorta una contraseña válida con espacios internos', () => {
    expect(validatePasswordPolicy('Pass word1!').ok).toBe(true)
  })

  it('rechaza SLA con resolución menor que respuesta', () => {
    expect(validateSlaHours(8, 4)).toMatch(/resolución/i)
  })

  it('rechaza rango con fecha inicial posterior a la final', () => {
    expect(validateDateRange('2026-08-10', '2026-08-01')).toMatch(/fecha inicial/i)
  })

  it('rechaza archivo mayor a 5 MB', async () => {
    const file = new File([new Uint8Array(LIMITS.FILE_MAX_BYTES + 1)], 'grande.pdf', { type: 'application/pdf' })
    expect(await validateAttachmentFile(file)).toMatch(/5 MB/)
  })
})
