import { LIMITS } from '@/constants/validation'
import type { UserRole } from '@/types/user.types'
import { passwordConfirmationError } from '@/utils/password-form'
import { MANAGED_USER_ROLES } from '@/utils/user-admin'
import { maxLengthAfterTrim, minLengthAfterTrim, requiredTrimmed, validatePasswordPolicy } from '@/utils/validation'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function userCreateFormError(input: {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  role: UserRole
}): string | null {
  if (!input.fullName.trim() || !input.email.trim() || !input.password) {
    return 'Todos los campos son obligatorios'
  }
  const nameError =
    minLengthAfterTrim(input.fullName, 'El nombre', LIMITS.USER_FULL_NAME_MIN) ||
    maxLengthAfterTrim(input.fullName, 'El nombre', LIMITS.USER_FULL_NAME)
  if (nameError) return nameError
  const emailError =
    requiredTrimmed(input.email, 'El correo') || maxLengthAfterTrim(input.email, 'El correo', LIMITS.EMAIL)
  if (emailError) return emailError
  if (!EMAIL_PATTERN.test(input.email.trim())) return 'El correo no es válido'
  if (!MANAGED_USER_ROLES.includes(input.role)) return 'El rol no es válido'
  const passwordResult = validatePasswordPolicy(input.password)
  if (!passwordResult.ok) return passwordResult.message
  return passwordConfirmationError(input.password, input.confirmPassword)
}

export function userEditFormError(input: { fullName: string; email: string; role: UserRole }): string | null {
  if (!input.fullName.trim() || !input.email.trim()) {
    return 'Nombre y correo son obligatorios'
  }
  const nameError =
    minLengthAfterTrim(input.fullName, 'El nombre', LIMITS.USER_FULL_NAME_MIN) ||
    maxLengthAfterTrim(input.fullName, 'El nombre', LIMITS.USER_FULL_NAME)
  if (nameError) return nameError
  if (!EMAIL_PATTERN.test(input.email.trim())) return 'El correo no es válido'
  if (!MANAGED_USER_ROLES.includes(input.role)) return 'El rol no es válido'
  return null
}

export function loginInactiveError(message?: string) {
  return message || 'Credenciales inválidas o cuenta no disponible.'
}
