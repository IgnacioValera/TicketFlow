import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import { extname, resolve } from 'path'
import { readFile, unlink } from 'fs/promises'
import { fromBuffer } from 'file-type'
import JSZip from 'jszip'
import { memoryStorage } from 'multer'
import { LIMITS } from '../common/limits'

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export type CanonicalFileKind = 'pdf' | 'docx' | 'jpg' | 'png'

const KIND_BY_EXT: Record<string, CanonicalFileKind> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.jpg': 'jpg',
  '.jpeg': 'jpg',
  '.png': 'png',
}

const ALLOWED_DECLARED_MIMES: Record<CanonicalFileKind, Set<string>> = {
  pdf: new Set(['application/pdf']),
  docx: new Set([DOCX_MIME]),
  jpg: new Set(['image/jpeg', 'image/jpg']),
  png: new Set(['image/png']),
}

const CANONICAL_EXT: Record<CanonicalFileKind, string> = {
  pdf: '.pdf',
  docx: '.docx',
  jpg: '.jpg',
  png: '.png',
}

const CANONICAL_MIME: Record<CanonicalFileKind, string> = {
  pdf: 'application/pdf',
  docx: DOCX_MIME,
  jpg: 'image/jpeg',
  png: 'image/png',
}

const DETECTED_TO_KIND: Record<string, CanonicalFileKind> = {
  pdf: 'pdf',
  docx: 'docx',
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
}

export interface ValidatedUpload {
  buffer: Buffer
  displayName: string
  canonicalExt: string
  mimeType: string
  sizeBytes: number
}

export function normalizeDeclaredMime(mime: string | undefined): string {
  const lower = (mime ?? '').toLowerCase().trim()
  if (lower === 'image/jpg') return 'image/jpeg'
  return lower
}

export function isDeclaredTypeAllowed(originalName: string, mime: string | undefined): boolean {
  const ext = extname(originalName).toLowerCase()
  const kind = KIND_BY_EXT[ext]
  if (!kind) return false
  const declared = normalizeDeclaredMime(mime)
  if (!declared) return true
  return ALLOWED_DECLARED_MIMES[kind].has(declared) || declared === CANONICAL_MIME[kind]
}

export function sanitizeDisplayName(originalName: string): string {
  if (!originalName || originalName.includes('\0')) {
    throw new BadRequestException('Nombre de archivo inválido')
  }
  if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
    throw new BadRequestException('Nombre de archivo inválido')
  }
  const cleaned = originalName.replace(/[<>:"|?*\x00-\x1f]/g, '_').trim()
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new BadRequestException('Nombre de archivo inválido')
  }
  return cleaned.slice(0, LIMITS.FILE_NAME)
}

export async function readUploadedBytes(file: Express.Multer.File): Promise<Buffer> {
  if (file.buffer && Buffer.isBuffer(file.buffer) && file.buffer.length > 0) {
    return file.buffer
  }
  if (file.path && typeof file.path === 'string') {
    return readFile(resolve(file.path))
  }
  throw new BadRequestException('No se pudo leer el contenido del archivo')
}

export async function removeTempUpload(file: Express.Multer.File | undefined): Promise<void> {
  if (file?.path) {
    await unlink(file.path).catch(() => undefined)
  }
}

async function assertValidDocx(buffer: Buffer): Promise<void> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: true })
  } catch {
    throw new BadRequestException('El archivo DOCX está corrupto o no es un ZIP válido')
  }
  const contentTypes = zip.file('[Content_Types].xml')
  const documentXml = zip.file('word/document.xml')
  if (!contentTypes || !documentXml) {
    throw new BadRequestException('El archivo no es un DOCX válido: debe contener [Content_Types].xml y word/document.xml')
  }
}

function kindFromDetection(detected: { ext: string; mime: string } | undefined): CanonicalFileKind | null {
  if (!detected) return null
  if (detected.ext === 'zip' || detected.mime === 'application/zip') return null
  return DETECTED_TO_KIND[detected.ext] ?? null
}

export async function validateUploadedFile(file: Express.Multer.File): Promise<ValidatedUpload> {
  const displayName = sanitizeDisplayName(file.originalname)
  const ext = extname(displayName).toLowerCase()
  const declaredKind = KIND_BY_EXT[ext]
  if (!declaredKind) {
    throw new BadRequestException('Tipo de archivo no permitido. Usa PDF, DOCX, JPG o PNG')
  }

  const declaredMime = normalizeDeclaredMime(file.mimetype)
  if (declaredMime && !ALLOWED_DECLARED_MIMES[declaredKind].has(declaredMime) && declaredMime !== CANONICAL_MIME[declaredKind]) {
    throw new BadRequestException('El tipo MIME declarado no coincide con la extensión permitida')
  }

  const buffer = await readUploadedBytes(file)
  if (buffer.length > LIMITS.FILE_MAX_BYTES || (file.size && file.size > LIMITS.FILE_MAX_BYTES)) {
    throw new PayloadTooLargeException(`El archivo no debe superar ${LIMITS.FILE_MAX_BYTES / (1024 * 1024)} MB`)
  }

  const detected = await fromBuffer(buffer)
  if (declaredKind === 'docx') {
    const looksLikeZip = detected?.ext === 'zip' || detected?.ext === 'docx' || detected?.mime === 'application/zip' || detected?.mime === DOCX_MIME
    if (!looksLikeZip) {
      throw new BadRequestException('El contenido del archivo no corresponde a un DOCX')
    }
    await assertValidDocx(buffer)
  } else {
    const detectedKind = kindFromDetection(detected)
    if (!detectedKind || detectedKind !== declaredKind) {
      throw new BadRequestException('El contenido real del archivo no coincide con la extensión o el tipo declarado')
    }
  }

  return {
    buffer,
    displayName,
    canonicalExt: CANONICAL_EXT[declaredKind],
    mimeType: CANONICAL_MIME[declaredKind],
    sizeBytes: buffer.length,
  }
}

export const attachmentMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: LIMITS.FILE_MAX_BYTES },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!isDeclaredTypeAllowed(file.originalname, file.mimetype)) {
      callback(new BadRequestException('Tipo de archivo no permitido. Usa PDF, DOCX, JPG o PNG'), false)
      return
    }
    callback(null, true)
  },
}
