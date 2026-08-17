function translateMessage(message: string) {
  if (/hexadecimal color/i.test(message) || /must be a hexadecimal/i.test(message)) {
    return 'El color debe tener formato hexadecimal, por ejemplo #2563EB.'
  }
  if (/must be longer than or equal/i.test(message) && /color/i.test(message)) {
    return 'El color no puede superar 7 caracteres.'
  }
  if (/must be shorter than or equal/i.test(message) && /color/i.test(message)) {
    return 'El color no puede superar 7 caracteres.'
  }
  if (/Failed to fetch|Network Error|Unexpected error/i.test(message)) {
    return 'No se pudo completar la solicitud.'
  }
  if (/No se pudo cargar la información/i.test(message)) {
    return 'No se pudo completar la solicitud.'
  }
  return message
}

function flattenMessages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.flatMap(flattenMessages)
  if (typeof raw !== 'string' || !raw.trim()) return []
  if (/must be/i.test(raw) && raw.includes(',')) {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return [raw.trim()]
}

export function getErrorMessages(error: unknown, fallback: string): string[] {
  const raw = (error as { message?: unknown } | undefined)?.message
  const translated = flattenMessages(raw).map(translateMessage).filter(Boolean)
  return translated.length ? translated : [fallback]
}

export function isValidationError(error: unknown) {
  const status = (error as { status?: number } | undefined)?.status
  return status === 400
}
