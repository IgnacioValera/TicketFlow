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
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/tickets" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
      </div>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c8191]">
          Nueva solicitud
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-navy md:text-3xl">
          Crear ticket
        </h1>
        <p className="mt-2 text-sm text-[#766c7c]">
          Describe el problema con claridad para acelerar su atención.
        </p>
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-brand-scarlet/30 bg-red-50 px-3 py-2 text-sm text-brand-scarlet">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-brand-slate/30 bg-white p-6 shadow-[0_12px_35px_rgba(61,45,69,.06)] md:p-8">
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
