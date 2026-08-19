import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TicketForm, type TicketFormValues } from '@/components/tickets/TicketForm'
import { useTickets } from '@/hooks/useTickets'

export function TicketCreatePage() {
  const navigate = useNavigate()
  const { createTicket, loading } = useTickets()
  const [submitting, setSubmitting] = useState(false)
  const createdRef = useRef(false)

  const handleSubmit = async (values: TicketFormValues) => {
    if (createdRef.current || submitting) return

    setSubmitting(true)
    try {
      const ticket = await createTicket(values)
      createdRef.current = true
      navigate(`/tickets/${ticket.id}`, {
        replace: true,
        state: {
          created: true,
          folio: ticket.folio,
          refreshTickets: true,
        },
      })
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Nueva solicitud
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text md:text-3xl">
          Crear ticket
        </h1>
        <p className="mt-2 text-sm text-muted">
          Describe el problema con claridad para acelerar su atención.
        </p>
      </div>
      <div className="ui-card p-6 md:p-8">
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
