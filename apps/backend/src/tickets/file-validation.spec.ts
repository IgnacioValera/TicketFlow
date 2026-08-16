import JSZip from 'jszip'
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import { LIMITS } from '../common/limits'
import { validateUploadedFile } from './file-validation'

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const JPEG_1X1 = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAG/AP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Af//Z',
  'base64',
)

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')

function multerFile(name: string, mime: string, buffer: Buffer): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: name,
    encoding: '7bit',
    mimetype: mime,
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  }
}

async function validDocx(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types></Types>')
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document></w:document>')
  return zip.generateAsync({ type: 'nodebuffer' })
}

describe('Validación de adjuntos', () => {
  it('acepta PNG válido', async () => {
    const result = await validateUploadedFile(multerFile('foto.png', 'image/png', PNG_1X1))
    expect(result.canonicalExt).toBe('.png')
    expect(result.mimeType).toBe('image/png')
  })

  it('acepta JPG y normaliza jpeg/jpg', async () => {
    const jpg = await validateUploadedFile(multerFile('foto.jpg', 'image/jpg', JPEG_1X1))
    expect(jpg.canonicalExt).toBe('.jpg')
    expect(jpg.mimeType).toBe('image/jpeg')
    const jpeg = await validateUploadedFile(multerFile('foto.jpeg', 'image/jpeg', JPEG_1X1))
    expect(jpeg.canonicalExt).toBe('.jpg')
  })

  it('acepta PDF válido', async () => {
    const result = await validateUploadedFile(multerFile('doc.pdf', 'application/pdf', PDF))
    expect(result.canonicalExt).toBe('.pdf')
  })

  it('acepta DOCX con [Content_Types].xml y word/document.xml', async () => {
    const result = await validateUploadedFile(
      multerFile(
        'nota.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        await validDocx(),
      ),
    )
    expect(result.canonicalExt).toBe('.docx')
  })

  it('rechaza ZIP común disfrazado de DOCX', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'hola')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await expect(
      validateUploadedFile(
        multerFile('falso.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer),
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rechaza extensión permitida con contenido real inválido', async () => {
    await expect(validateUploadedFile(multerFile('a.pdf', 'application/pdf', Buffer.from('not-a-pdf')))).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('rechaza MIME permitido con extensión no permitida', async () => {
    await expect(validateUploadedFile(multerFile('malware.exe', 'application/pdf', PDF))).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rechaza nombre con path traversal', async () => {
    await expect(validateUploadedFile(multerFile('../secret.png', 'image/png', PNG_1X1))).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rechaza archivo mayor a 5 MB', async () => {
    const huge = Buffer.alloc(LIMITS.FILE_MAX_BYTES + 1, 1)
    huge[0] = 0x25
    huge[1] = 0x50
    huge[2] = 0x44
    huge[3] = 0x46
    await expect(validateUploadedFile(multerFile('grande.pdf', 'application/pdf', huge))).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    )
  })
})
