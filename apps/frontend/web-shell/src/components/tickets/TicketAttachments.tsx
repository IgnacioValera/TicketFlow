import { useRef, useState } from 'react'
import { PERMISSIONS } from '@/constants/permissions'
import { ConfirmModal } from '@/components/common/Modal'
import { usePermissions } from '@/hooks/usePermissions'
import type { TicketAttachment } from '@/types/ticket.types'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface TicketAttachmentsProps {
  attachments: TicketAttachment[]
  loading?: boolean
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TicketAttachments({
  attachments,
  loading,
  onUpload,
  onDelete,
}: TicketAttachmentsProps) {
  const { hasPermission } = usePermissions()
  const canUpload = hasPermission(PERMISSIONS.ATTACHMENT_UPLOAD)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE_BYTES) return 'El archivo no debe superar 5 MB'
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Tipo no permitido. Usa imágenes, PDF o DOCX'
    }
    return null
  }

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setUploading(true)
    setError('')
    try {
      await onUpload(file)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      await onDelete(deleteId)
      setDeleteId(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-brand-navy">Adjuntos</h3>
      {loading ? (
        <p className="text-sm text-slate-500">Cargando adjuntos...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-slate-500">Sin archivos adjuntos.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-slate/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-medium text-brand-teal hover:underline"
                >
                  {a.fileName}
                </a>
                <p className="text-xs text-slate-500">
                  {formatSize(a.sizeBytes)} · {a.uploadedByName}
                </p>
              </div>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => setDeleteId(a.id)}
                  className="text-sm text-brand-scarlet hover:underline"
                >
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={(e) => void handleFileChange(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-brand-slate px-3 py-1.5 text-sm text-brand-navy hover:bg-brand-cream/50 disabled:opacity-50"
          >
            {uploading ? 'Subiendo...' : 'Subir archivo'}
          </button>
          <p className="mt-1 text-xs text-slate-500">Máx. 5 MB · Imágenes, PDF o DOCX</p>
        </div>
      )}
      {error && <p className="text-sm text-brand-scarlet">{error}</p>}

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar adjunto"
        message="¿Deseas eliminar este archivo? Esta acción no se puede deshacer."
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  )
}
