import { LIMITS } from '@/constants/validation'
import { maxLengthAfterTrim, minLengthAfterTrim, requiredTrimmed } from '@/utils/validation'

export interface TicketFormValues {
  title: string
  description: string
  categoryId: string
  priorityId: string
  clientId?: string
  requesterId?: string
}

export function validateTicketForm(values: TicketFormValues): string | null {
  const titleError =
    requiredTrimmed(values.title, 'El título') ||
    minLengthAfterTrim(values.title, 'El título', LIMITS.TICKET_TITLE_MIN) ||
    maxLengthAfterTrim(values.title, 'El título', LIMITS.TICKET_TITLE)
  if (titleError) return titleError

  const descriptionError =
    requiredTrimmed(values.description, 'La descripción') ||
    minLengthAfterTrim(values.description, 'La descripción', LIMITS.TICKET_DESCRIPTION_MIN) ||
    maxLengthAfterTrim(values.description, 'La descripción', LIMITS.TICKET_DESCRIPTION)
  if (descriptionError) return descriptionError

  if (!values.categoryId || !values.priorityId) {
    return 'Selecciona categoría y prioridad activas'
  }

  return null
}

export function normalizeTicketForm(values: TicketFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    categoryId: values.categoryId,
    priorityId: values.priorityId,
    clientId: values.clientId?.trim() ? values.clientId : undefined,
    requesterId: values.requesterId?.trim() ? values.requesterId : undefined,
  }
}
