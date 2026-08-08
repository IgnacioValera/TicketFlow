import { useState, type FormEvent } from 'react'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import type { TicketComment } from '@/types/ticket.types'

interface TicketCommentsProps {
  comments: TicketComment[]
  loading?: boolean
  onAdd: (body: string, isInternal: boolean) => Promise<void>
}

export function TicketComments({ comments, loading, onAdd }: TicketCommentsProps) {
  const { hasPermission } = usePermissions()
  const canInternal = hasPermission(PERMISSIONS.COMMENT_INTERNAL)
  const [body, setBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await onAdd(body.trim(), canInternal && isInternal)
      setBody('')
      setIsInternal(false)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al comentar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-brand-navy">Comentarios</h3>
      {loading ? (
        <p className="text-sm text-slate-500">Cargando comentarios...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay comentarios.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className={`rounded-lg border p-3 ${c.isInternal ? 'border-amber-200 bg-amber-50' : 'border-brand-slate/30 bg-white'}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-brand-navy">{c.authorName}</span>
                <span>{new Date(c.createdAt).toLocaleString('es-MX')}</span>
                {c.isInternal && (
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-amber-900">Interno</span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-700">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
        {error && <p className="text-sm text-brand-scarlet">{error}</p>}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Escribe un comentario..."
          className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
        />
        {canInternal && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
            />
            Comentario interno (solo equipo de soporte)
          </label>
        )}
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
        >
          {submitting ? 'Enviando...' : 'Agregar comentario'}
        </button>
      </form>
    </div>
  )
}
