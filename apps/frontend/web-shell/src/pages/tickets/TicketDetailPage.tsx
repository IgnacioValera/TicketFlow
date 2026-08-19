import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SlaSemaphore } from '@/components/tickets/SlaSemaphore'
import { TicketAssignModal } from '@/components/tickets/TicketAssignModal'
import { TicketAttachments } from '@/components/tickets/TicketAttachments'
import { TicketComments } from '@/components/tickets/TicketComments'
import { TicketForm } from '@/components/tickets/TicketForm'
import { TicketStatusActions } from '@/components/tickets/TicketStatusActions'
import { TicketSurveyModal } from '@/components/tickets/TicketSurveyModal'
import { TicketTimeline } from '@/components/tickets/TicketTimeline'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useTickets } from '@/hooks/useTickets'
import * as prioritiesService from '@/services/priorities.service'
import type { Priority } from '@/types/catalog.types'
import type { TicketStatus } from '@/types/ticket.types'

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const {
    ticket,
    comments,
    attachments,
    sla,
    loading,
    error,
    loadTicket,
    updateTicket,
    changeStatus,
    assignTicket,
    escalateTicket,
    closeTicket,
    loadComments,
    addComment,
    loadAttachments,
    uploadAttachment,
    removeAttachment,
    loadSla,
    submitSurvey,
  } = useTickets()

  const [editing, setEditing] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [surveyOpen, setSurveyOpen] = useState(false)
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [priorityLoading, setPriorityLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const refresh = useCallback(async () => {
    if (!id) return
    await Promise.all([loadTicket(id), loadComments(id), loadAttachments(id), loadSla(id)])
  }, [id, loadTicket, loadComments, loadAttachments, loadSla])

  useEffect(() => {
    void refresh().catch(() => undefined)
  }, [refresh])

  useEffect(() => {
    if (ticket?.status === 'CLOSED' && !ticket.survey && user?.id === ticket.requesterId) {
      if (hasPermission(PERMISSIONS.SURVEY_RESPOND)) {
        setSurveyOpen(true)
      }
    }
  }, [ticket, user, hasPermission])

  useEffect(() => {
    const load = async () => {
      const res = await prioritiesService.getPriorities({ status: 'ACTIVE', perPage: 100 })
      setPriorities(res.data)
    }
    void load()
  }, [])

  const isFinalized = ticket?.status === 'CLOSED' || ticket?.status === 'CANCELLED'

  const canEdit =
    ticket &&
    !isFinalized &&
    ((hasPermission(PERMISSIONS.TICKET_EDIT_OWN) &&
      ticket.requesterId === user?.id &&
      ['OPEN', 'ASSIGNED'].includes(ticket.status)) ||
      user?.role === 'SUPERVISOR' ||
      user?.role === 'ADMIN')

  const canAssign =
    !isFinalized &&
    (hasPermission(PERMISSIONS.TICKET_ASSIGN) || hasPermission(PERMISSIONS.TICKET_REASSIGN))

  const canChangePriority =
    ticket &&
    !isFinalized &&
    (user?.role === 'SUPERVISOR' ||
      user?.role === 'ADMIN' ||
      (user?.role === 'AGENT' && ticket.assigneeId === user.id))

  const handleEdit = async (values: {
    title: string
    description: string
    categoryId: string
    priorityId: string
  }) => {
    if (!id) return
    setEditLoading(true)
    setActionError('')
    try {
      await updateTicket(id, values)
      setEditing(false)
      await refresh()
    } catch (err: unknown) {
      setActionError((err as { message?: string }).message || 'No se pudo actualizar el ticket')
    } finally {
      setEditLoading(false)
    }
  }

  const handlePriorityChange = async (priorityId: string) => {
    if (!id || !ticket) return
    setPriorityLoading(true)
    setActionError('')
    try {
      await updateTicket(id, { priorityId })
      await refresh()
    } catch (err: unknown) {
      setActionError((err as { message?: string }).message || 'No se pudo cambiar la prioridad')
    } finally {
      setPriorityLoading(false)
    }
  }

  const handleStatusChange = async (status: TicketStatus, reason?: string) => {
    if (!id) return
    setActionError('')
    try {
      await changeStatus(id, { status, reason })
      await refresh()
    } catch (err: unknown) {
      setActionError((err as { message?: string }).message || 'No se pudo cambiar el estado')
      throw err
    }
  }

  const handleAssign = async (assigneeId: string) => {
    if (!id) return
    setActionError('')
    try {
      await assignTicket(id, { assigneeId })
      await refresh()
    } catch (err: unknown) {
      setActionError((err as { message?: string }).message || 'No se pudo asignar el ticket')
      throw err
    }
  }

  const handleEscalate = async (reason: string) => {
    if (!id) return
    setActionError('')
    try {
      await escalateTicket(id, { reason })
      await refresh()
    } catch (err: unknown) {
      setActionError((err as { message?: string }).message || 'No se pudo escalar el ticket')
      throw err
    }
  }

  const handleClose = async () => {
    if (!id) return
    setActionError('')
    try {
      await closeTicket(id)
      await refresh()
    } catch (err: unknown) {
      setActionError((err as { message?: string }).message || 'No se pudo cerrar el ticket')
      throw err
    }
  }

  if (loading && !ticket) {
    return <LoadingSkeleton variant="ticket" label="Cargando ticket…" delayed={false} />
  }

  if (error && !ticket) {
    return <ErrorState message={error} onRetry={() => void refresh()} />
  }

  if (!ticket) {
    return <ErrorState message="Ticket no encontrado" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/tickets" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
        <span className="text-sm text-slate-400">|</span>
        <span className="font-mono text-sm text-slate-600">{ticket.folio}</span>
        <Link
          to={`/tickets/${ticket.id}/flow`}
              className="ml-auto inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Ver flujo visual
        </Link>
      </div>

      {actionError && (
        <div className="rounded-lg border border-brand-scarlet/30 bg-red-50 px-3 py-2 text-sm text-brand-scarlet">
          {actionError}
        </div>
      )}

      {isFinalized && (
        <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Este ticket está {ticket.status === 'CLOSED' ? 'cerrado' : 'cancelado'} y es de solo lectura.
          {ticket.status === 'CLOSED' ? ' Puedes reabrirlo si tu rol lo permite.' : ' No se puede reabrir.'}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="ui-card p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-brand-navy sm:text-2xl">{ticket.title}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Creado {new Date(ticket.createdAt).toLocaleString('es-MX')}
                  {ticket.requesterName && ` · ${ticket.requesterName}`}
                </p>
              </div>
              <StatusBadge status={ticket.status} />
            </div>

            {editing ? (
              <TicketForm
                initialValues={{
                  title: ticket.title,
                  description: ticket.description,
                  categoryId: ticket.categoryId,
                  priorityId: ticket.priorityId,
                }}
                submitLabel="Guardar cambios"
                loading={editLoading}
                onSubmit={handleEdit}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="mt-4 text-sm text-brand-teal hover:underline"
                  >
                    Editar
                  </button>
                )}
              </>
            )}
          </div>

          <div className="ui-card p-6">
            <TicketComments
              comments={comments}
              readOnly={isFinalized}
              onAdd={async (body, isInternal) => {
                await addComment(ticket.id, { body, isInternal })
              }}
            />
          </div>

          <div className="ui-card p-6">
            <TicketAttachments
              attachments={attachments}
              readOnly={isFinalized}
              onUpload={async (file) => {
                await uploadAttachment(ticket.id, file)
              }}
              onDelete={async (attachmentId) => {
                await removeAttachment(attachmentId)
              }}
            />
          </div>

          <div className="ui-card p-6">
            <h3 className="mb-4 text-base font-semibold text-brand-navy">Historial</h3>
            <TicketTimeline history={ticket.statusHistory ?? []} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="ui-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-brand-navy">Detalles</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Categoría</dt>
                <dd className="font-medium text-brand-navy">{ticket.categoryName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Prioridad</dt>
                <dd>
                  {canChangePriority ? (
                    <select
                      value={ticket.priorityId}
                      disabled={priorityLoading}
                      onChange={(e) => void handlePriorityChange(e.target.value)}
                      className="rounded border border-brand-slate px-2 py-1 text-sm"
                      style={{ color: ticket.priorityColor }}
                    >
                      {priorities.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: ticket.priorityColor }}>{ticket.priorityName}</span>
                  )}
                </dd>
              </div>
              {ticket.companyName && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Empresa</dt>
                  <dd className="font-medium text-brand-navy">{ticket.companyName}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Agente</dt>
                <dd className="font-medium text-brand-navy">
                  {ticket.assigneeName ?? 'Sin asignar'}
                </dd>
              </div>
            </dl>
            {canAssign && (
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="mt-3 w-full rounded-lg border border-brand-teal px-3 py-1.5 text-sm font-medium text-brand-teal hover:bg-brand-teal/10"
              >
                {ticket.assigneeId ? 'Reasignar' : 'Asignar agente'}
              </button>
            )}
          </div>

          {sla && (
            <div className="ui-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-brand-navy">SLA</h3>
              <SlaSemaphore sla={sla} />
              <p className="mt-2 text-xs text-slate-500">
                Vence: {new Date(sla.dueAt).toLocaleString('es-MX')}
              </p>
            </div>
          )}

          <div className="ui-card p-4">
            <TicketStatusActions
              ticket={ticket}
              onChangeStatus={handleStatusChange}
              onEscalate={handleEscalate}
              onClose={handleClose}
            />
          </div>

          {ticket.survey && (
            <div className="ui-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-brand-navy">Encuesta</h3>
              <p className="text-sm">
                Calificación: <strong>{ticket.survey.rating}/5</strong>
              </p>
              {ticket.survey.comment && (
                <p className="mt-1 text-sm text-slate-600">{ticket.survey.comment}</p>
              )}
            </div>
          )}
        </aside>
      </div>

      <TicketAssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssign}
        currentAssigneeId={ticket.assigneeId}
      />

      <TicketSurveyModal
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        onSubmit={async (rating, comment) => {
          await submitSurvey(ticket.id, { rating, comment })
          await refresh()
        }}
      />
    </div>
  )
}
