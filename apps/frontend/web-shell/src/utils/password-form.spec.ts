import { describe, expect, it } from 'vitest'
import { FORGOT_PASSWORD_LINK, ACCESS_RECOVERY_INSTRUCTIONS } from '@/constants/password-recovery'
import { newPasswordFormError, passwordConfirmationError } from '@/utils/password-form'

describe('Recuperación y cambio de contraseña', () => {
  it('muestra el enlace de recuperación interno', () => {
    expect(FORGOT_PASSWORD_LINK).toBe('¿Olvidaste tu contraseña?')
    expect(ACCESS_RECOVERY_INSTRUCTIONS.join(' ')).not.toMatch(/enlace|correo institucional|SMS/i)
  })

  it('rechaza confirmaciones distintas', () => {
    expect(passwordConfirmationError('NuevaClave1!', 'OtraClave1!')).toBe('Las contraseñas no coinciden.')
  })

  it('rechaza una contraseña nueva igual a la actual', () => {
    expect(newPasswordFormError('Actual1!', 'Actual1!', 'Actual1!')).toBe(
      'La contraseña nueva debe ser diferente de la actual.',
    )
  })

  it('rechaza una contraseña que no cumple la política', () => {
    expect(newPasswordFormError('Actual1!', 'debil', 'debil')).toBe('La contraseña no cumple los requisitos.')
  })

  it('acepta un cambio válido', () => {
    expect(newPasswordFormError('Actual1!', 'NuevaClave1!', 'NuevaClave1!')).toBeNull()
  })
})
