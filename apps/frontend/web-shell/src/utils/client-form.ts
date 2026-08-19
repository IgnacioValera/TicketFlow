import { LIMITS } from '@/constants/validation'
import type { ClientSegment, ClientStatus, ClientTier } from '@/types/crm.types'
import { maxLengthAfterTrim, requiredTrimmed } from '@/utils/validation'

export const CLIENT_PHONE_MESSAGE = 'El teléfono debe tener entre 8 y 10 dígitos'
const PHONE_PATTERN = /^\+?[0-9]{8,10}$/

export type ClientFormValues = {
  name: string
  industry: string
  region: string
  tier: ClientTier
  segment: ClientSegment
  email: string
  phone: string
  status: ClientStatus
}

export type ClientFormErrors = Partial<Record<keyof ClientFormValues, string>>

export function normalizeClientPhone(value: string) {
  const trimmed = value.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export function isValidClientPhone(value: string) {
  return PHONE_PATTERN.test(normalizeClientPhone(value))
}

export function validateClientForm(form: ClientFormValues): ClientFormErrors {
  const errors: ClientFormErrors = {}
  const nameError =
    requiredTrimmed(form.name, 'El nombre') || maxLengthAfterTrim(form.name, 'El nombre', LIMITS.CLIENT_NAME)
  if (nameError) errors.name = nameError
  const industryError =
    requiredTrimmed(form.industry, 'El giro') || maxLengthAfterTrim(form.industry, 'El giro', LIMITS.CLIENT_INDUSTRY)
  if (industryError) errors.industry = industryError
  const regionError =
    requiredTrimmed(form.region, 'La región') || maxLengthAfterTrim(form.region, 'La región', LIMITS.CLIENT_REGION)
  if (regionError) errors.region = regionError
  const emailError = requiredTrimmed(form.email, 'El correo') || maxLengthAfterTrim(form.email, 'El correo', LIMITS.EMAIL)
  if (emailError) errors.email = emailError
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'El correo no es válido'
  if (!form.phone.trim()) errors.phone = 'El teléfono es obligatorio y no puede contener solo espacios'
  else if (!isValidClientPhone(form.phone)) errors.phone = CLIENT_PHONE_MESSAGE
  return errors
}

export function mapClientApiError(message: unknown): ClientFormErrors {
  const text = Array.isArray(message) ? message.join(' ') : String(message ?? '')
  const errors: ClientFormErrors = {}
  if (/nombre/i.test(text)) errors.name = text
  if (/giro|industria/i.test(text)) errors.industry = text
  if (/región|region/i.test(text)) errors.region = text
  if (/correo/i.test(text)) errors.email = text
  if (/teléfono|telefono/i.test(text)) errors.phone = text
  return errors
}

export function buildClientPayload(form: ClientFormValues) {
  return {
    name: form.name.trim(),
    industry: form.industry.trim(),
    region: form.region.trim(),
    tier: form.tier,
    segment: form.segment,
    email: form.email.trim().toLowerCase(),
    phone: normalizeClientPhone(form.phone),
    status: form.status,
  }
}
