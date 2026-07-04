import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TicketForm } from '@/components/tickets/TicketForm'
import { useTickets } from '@/hooks/useTickets'

export function TicketCreatePage() {
  const navigate = useNavigate()
  const { createTicket, loading, error, setError } = useTickets()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values: {
    title: string
    description: string
    categoryId: string
    priorityId: string
  }) => {
    setSubmitting(true)
    setError('')
    try {
      const ticket = await createTicket(values)
      navigate(`/tickets/${ticket.id}`)
    } catch {
      // error handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/tickets" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-brand-navy">Nuevo ticket</h1>
      {error && (
        <div className="mb-4 rounded-lg border border-brand-scarlet/30 bg-red-50 px-3 py-2 text-sm text-brand-scarlet">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-brand-slate/30 bg-white p-6 shadow-sm">
        <TicketForm
          submitLabel="Crear ticket"
          loading={loading || submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/tickets')}
        />
      </div>
    </div>
  )
}
