import { FILE_MAX_MB, LIMITS } from '@/constants/validation'

export function requiredTrimmed(value: string, field: string): string | null {
  if (!value.trim()) return `${field} es obligatorio y no puede contener solo espacios`
  return null
}

export function maxLengthAfterTrim(value: string, field: string, max: number): string | null {
  if (value.trim().length > max) return `${field} no puede superar ${max} caracteres`
  return null
}

export function minLengthAfterTrim(value: string, field: string, min: number): string | null {
  if (value.trim().length < min) return `${field} debe tener al menos ${min} caracteres`
  return null
}

export type PasswordPolicyResult = { ok: true } | { ok: false; message: string }

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length > 0 && (password[0] === ' ' || password[password.length - 1] === ' ')) {
    return { ok: false, message: 'La contraseña no puede comenzar ni terminar con espacios' }
  }
  if (password.length < LIMITS.PASSWORD_MIN_CHARS) {
    return { ok: false, message: `La contraseña debe tener al menos ${LIMITS.PASSWORD_MIN_CHARS} caracteres` }
  }
  if (new TextEncoder().encode(password).length > LIMITS.PASSWORD_MAX_BYTES) {
    return { ok: false, message: `La contraseña no puede superar ${LIMITS.PASSWORD_MAX_BYTES} bytes UTF-8 (límite de bcrypt)` }
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: 'La contraseña debe incluir al menos una letra mayúscula' }
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: 'La contraseña debe incluir al menos una letra minúscula' }
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: 'La contraseña debe incluir al menos un número' }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: 'La contraseña debe incluir al menos un símbolo' }
  }
  return { ok: true }
}

export function validateSlaHours(responseHours: number, resolutionHours: number): string | null {
  if (!Number.isInteger(responseHours) || responseHours <= 0) {
    return 'El tiempo de respuesta debe ser un entero positivo'
  }
  if (!Number.isInteger(resolutionHours) || resolutionHours <= 0) {
    return 'El tiempo de resolución debe ser un entero positivo'
  }
  if (resolutionHours < responseHours) {
    return 'El tiempo de resolución debe ser mayor o igual que el tiempo de respuesta'
  }
  return null
}

export function validateDateRange(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return 'La fecha inicial y la fecha final son obligatorias'
  if (Number.isNaN(Date.parse(startDate))) return 'La fecha inicial no tiene un formato válido'
  if (Number.isNaN(Date.parse(endDate))) return 'La fecha final no tiene un formato válido'
  if (startDate > endDate) return 'La fecha inicial debe ser menor o igual que la fecha final'
  return null
}

const EXT_TO_KIND: Record<string, 'pdf' | 'docx' | 'jpg' | 'png'> = {
  pdf: 'pdf',
  docx: 'docx',
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
}

const MIME_TO_KIND: Record<string, 'pdf' | 'docx' | 'jpg' | 'png'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
}

export const ATTACHMENT_ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function validateAttachmentFile(file: File): Promise<string | null> {
  if (file.size > LIMITS.FILE_MAX_BYTES) {
    return `El archivo no debe superar ${FILE_MAX_MB} MB`
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const kindFromExt = EXT_TO_KIND[ext]
  if (!kindFromExt) {
    return 'Tipo no permitido. Usa PDF, DOCX, JPG o PNG'
  }
  const declaredMime = file.type.toLowerCase()
  if (declaredMime) {
    const kindFromMime = MIME_TO_KIND[declaredMime]
    if (!kindFromMime || kindFromMime !== kindFromExt) {
      return 'El tipo MIME no coincide con la extensión permitida'
    }
  }
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
  const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46
  const isZip = header[0] === 0x50 && header[1] === 0x4b
  if (kindFromExt === 'png' && !isPng) return 'El contenido del archivo no es un PNG válido'
  if (kindFromExt === 'jpg' && !isJpeg) return 'El contenido del archivo no es un JPG válido'
  if (kindFromExt === 'pdf' && !isPdf) return 'El contenido del archivo no es un PDF válido'
  if (kindFromExt === 'docx' && !isZip) return 'El contenido del archivo no es un DOCX válido'
  return null
}

export function errorMessage(err: unknown, fallback: string) {
  const raw = (err as { message?: string | string[] })?.message
  if (Array.isArray(raw)) {
    const joined = raw.map((item) => item.trim()).filter(Boolean).join(', ')
    return joined || fallback
  }
  return raw || fallback
}
