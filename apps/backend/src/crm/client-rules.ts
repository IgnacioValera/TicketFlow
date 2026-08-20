import { Transform } from 'class-transformer'

export const CLIENT_PHONE_MESSAGE = 'El teléfono debe tener entre 8 y 10 dígitos'
export const CLIENT_PHONE_PATTERN = /^\+?[0-9]{8,10}$/

export function normalizeClientPhone(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export function isValidClientPhone(value: string) {
  return CLIENT_PHONE_PATTERN.test(String(normalizeClientPhone(value) ?? ''))
}

export function NormalizePhone() {
  return Transform(({ value }: { value: unknown }) => normalizeClientPhone(value))
}
