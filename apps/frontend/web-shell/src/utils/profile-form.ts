import { LIMITS } from '@/constants/validation'
import { maxLengthAfterTrim, minLengthAfterTrim, requiredTrimmed } from '@/utils/validation'

export function ownProfileNameError(fullName: string): string | null {
  return (
    requiredTrimmed(fullName, 'El nombre') ||
    minLengthAfterTrim(fullName, 'El nombre', LIMITS.USER_FULL_NAME_MIN) ||
    maxLengthAfterTrim(fullName, 'El nombre', LIMITS.USER_FULL_NAME)
  )
}

export function buildOwnProfilePayload(fullName: string) {
  return { fullName: fullName.trim() }
}
