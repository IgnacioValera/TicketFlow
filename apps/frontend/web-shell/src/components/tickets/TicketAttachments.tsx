import { useRef, useState } from 'react'
import { PERMISSIONS } from '@/constants/permissions'
import { FILE_MAX_MB } from '@/constants/validation'
import { ConfirmModal } from '@/components/common/Modal'
import { usePermissions } from '@/hooks/usePermissions'
import type { TicketAttachment } from '@/types/ticket.types'
import { ATTACHMENT_ACCEPT, errorMessage, validateAttachmentFile } from '@/utils/validation'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface TicketAttachmentsProps {
  attachments: TicketAttachment[]
  loading?: boolean
  readOnly?: boolean
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TicketAttachments({
  attachments,
  loading,
  readOnly = false,
  onUpload,
  onDelete,
}: TicketAttachmentsProps) {
  const { hasPermission } = usePermissions()
  const canUpload = hasPermission(PERMISSIONS.ATTACHMENT_UPLOAD) && !readOnly
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return
    const validationError = await validateAttachmentFile(file)
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
      setError(errorMessage(err, 'Error al subir archivo'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    setError('')
    try {
      await onDelete(deleteId)
      setDeleteId(null)
    } catch (err: unknown) {
      setError(errorMessage(err, 'No se pudo eliminar el adjunto'))
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
            accept={ATTACHMENT_ACCEPT}
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
          <p className="mt-1 text-xs text-slate-500">Máx. {FILE_MAX_MB} MB · PDF, DOCX, JPG o PNG</p>
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
