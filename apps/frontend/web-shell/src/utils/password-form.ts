import { validatePasswordPolicy } from '@/utils/validation'

export function passwordConfirmationError(password: string, confirmation: string): string | null {
  if (password !== confirmation) return 'Las contraseñas no coinciden.'
  return null
}

export function newPasswordFormError(
  currentPassword: string,
  newPassword: string,
  confirmation: string,
): string | null {
  if (!currentPassword || !newPassword || !confirmation) {
    return 'Completa todos los campos de contraseña'
  }
  const mismatch = passwordConfirmationError(newPassword, confirmation)
  if (mismatch) return mismatch
  if (currentPassword === newPassword) {
    return 'La contraseña nueva debe ser diferente de la actual.'
  }
  if (!validatePasswordPolicy(newPassword).ok) {
    return 'La contraseña no cumple los requisitos.'
  }
  return null
}
