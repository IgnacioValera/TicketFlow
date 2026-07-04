import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'

interface TicketSurveyModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (rating: number, comment?: string) => Promise<void>
}

export function TicketSurveyModal({ open, onClose, onSubmit }: TicketSurveyModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (rating < 1 || rating > 5) {
      setError('Selecciona una calificación de 1 a 5')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit(rating, comment.trim() || undefined)
      setRating(0)
      setComment('')
      onClose()
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al enviar encuesta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Encuesta de satisfacción"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
            disabled={loading}
          >
            Omitir
          </button>
          <button
            type="submit"
            form="survey-form"
            disabled={loading || rating === 0}
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </>
      }
    >
      <form id="survey-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <p className="text-sm text-brand-scarlet">{error}</p>}
        <p className="text-sm text-slate-600">
          ¿Qué tan satisfecho estás con la resolución de tu ticket?
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`h-10 w-10 rounded-lg border text-sm font-semibold transition-colors ${
                rating >= n
                  ? 'border-brand-teal bg-brand-teal text-white'
                  : 'border-brand-slate text-brand-navy hover:border-brand-teal'
              }`}
              aria-label={`Calificación ${n}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="survey-comment" className="mb-1 block text-sm font-medium text-brand-navy">
            Comentario (opcional)
          </label>
          <textarea
            id="survey-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
          />
        </div>
      </form>
    </Modal>
  )
}
