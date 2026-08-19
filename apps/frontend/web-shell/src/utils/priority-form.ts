import { LIMITS } from '@/constants/validation'
import type { CreatePriorityPayload, PriorityLevel } from '@/types/catalog.types'
import { isHexColor, normalizeHexColor } from '@/utils/color'
import { maxLengthAfterTrim, minLengthAfterTrim, requiredTrimmed } from '@/utils/validation'

const PRIORITY_LEVELS: PriorityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function availablePriorityLevels(
  usedActiveLevels: Iterable<PriorityLevel>,
  editingLevel?: PriorityLevel,
) {
  const used = new Set(usedActiveLevels)
  return PRIORITY_LEVELS.filter((level) => !used.has(level) || editingLevel === level)
}

export interface PriorityFormValues {
  name: string
  level: PriorityLevel
  color: string
  description: string
}

export function validatePriorityForm(values: PriorityFormValues): string | null {
  const nameError =
    requiredTrimmed(values.name, 'El nombre') ||
    minLengthAfterTrim(values.name, 'El nombre', LIMITS.PRIORITY_NAME_MIN) ||
    maxLengthAfterTrim(values.name, 'El nombre', LIMITS.PRIORITY_NAME)
  if (nameError) return nameError

  const color = normalizeHexColor(values.color)
  if (!isHexColor(color)) {
    return 'El color debe tener formato hexadecimal, por ejemplo #2563EB.'
  }

  const description = values.description.trim()
  if (values.description && !description) {
    return 'La descripción no puede contener solo espacios'
  }
  if (description.length > LIMITS.CATALOG_DESCRIPTION) {
    return `La descripción no puede superar ${LIMITS.CATALOG_DESCRIPTION} caracteres`
  }

  return null
}

export function buildPriorityPayload(values: PriorityFormValues): CreatePriorityPayload {
  const name = values.name.trim()
  const description = values.description.trim()
  const color = normalizeHexColor(values.color)

  return {
    name,
    level: values.level,
    color,
    ...(description ? { description } : {}),
  }
}
