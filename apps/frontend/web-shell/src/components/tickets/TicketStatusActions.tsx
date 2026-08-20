import { useState } from 'react'
import { PERMISSIONS } from '@/constants/permissions'
import { LIMITS } from '@/constants/validation'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import type { Ticket, TicketStatus } from '@/types/ticket.types'
import { errorMessage, maxLengthAfterTrim, requiredTrimmed } from '@/utils/validation'
import { getAllowedTransitions, STATUS_ACTION_LABELS } from '@/utils/ticket-state-machine'
import { ConfirmModal, Modal } from '@/components/common/Modal'

interface TicketStatusActionsProps {
  ticket: Ticket
  onChangeStatus: (status: TicketStatus, reason?: string) => Promise<void>
  onEscalate: (reason: string) => Promise<void>
  onClose: () => Promise<void>
  loading?: boolean
}

function requiresReason(from: TicketStatus, to: TicketStatus) {
  return (
    to === 'ESCALATED' ||
    to === 'CANCELLED' ||
    to === 'WAITING_USER' ||
    to === 'RESOLVED' ||
    (from === 'CLOSED' && to === 'IN_PROGRESS')
  )
}

export function TicketStatusActions({
  ticket,
  onChangeStatus,
  onEscalate,
  onClose,
  loading = false,
}: TicketStatusActionsProps) {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [reasonModal, setReasonModal] = useState<{
    type: 'status' | 'escalate'
    status?: TicketStatus
  } | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  if (!user) return null

  const ctx = {
    role: user.role,
    permissions: user.permissions,
    isAssignee: ticket.assigneeId === user.id,
    isRequester: ticket.requesterId === user.id,
  }

  const allowed = getAllowedTransitions(ticket.status, ctx)
  const canEscalate =
    hasPermission(PERMISSIONS.TICKET_ESCALATE) &&
    allowed.includes('ESCALATED') &&
    ticket.status !== 'ESCALATED'
  const canClose =
    (ctx.isRequester && ticket.status === 'RESOLVED') ||
    (hasPermission(PERMISSIONS.TICKET_STATUS_CHANGE) &&
      hasPermission(PERMISSIONS.TICKET_VIEW_ALL) &&
      ticket.status === 'RESOLVED')

  const handleStatusClick = async (status: TicketStatus) => {
    setActionError('')
    if (requiresReason(ticket.status, status) || status === 'ESCALATED') {
      setReasonModal({ type: status === 'ESCALATED' ? 'escalate' : 'status', status })
      return
    }
    setActionLoading(true)
    try {
      await onChangeStatus(status)
    } catch (err: unknown) {
      setActionError(errorMessage(err, 'No se pudo actualizar el estado'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReasonConfirm = async () => {
    if (!reasonModal) return
    const min = reasonModal.type === 'escalate' ? LIMITS.ESCALATE_REASON_MIN : 1
    const validation =
      requiredTrimmed(reason, 'El motivo') ||
      (reason.trim().length < min ? `El motivo debe tener al menos ${min} caracteres` : null) ||
      maxLengthAfterTrim(reason, 'El motivo', LIMITS.REASON)
    if (validation) {
      setReasonError(validation)
      return
    }
    setActionLoading(true)
    setReasonError('')
    setActionError('')
    try {
      if (reasonModal.type === 'escalate') {
        await onEscalate(reason.trim())
      } else if (reasonModal.status) {
        await onChangeStatus(reasonModal.status, reason.trim())
      }
      setReasonModal(null)
      setReason('')
    } catch (err: unknown) {
      setReasonError(errorMessage(err, 'No se pudo completar la acción'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseConfirm = async () => {
    setActionLoading(true)
    setActionError('')
    try {
      await onClose()
      setConfirmClose(false)
    } catch (err: unknown) {
      setActionError(errorMessage(err, 'No se pudo cerrar el ticket'))
    } finally {
      setActionLoading(false)
    }
  }

  const statusButtons = allowed.filter((s) => s !== 'ESCALATED' && s !== 'CLOSED')

  if (statusButtons.length === 0 && !canEscalate && !canClose) {
    return null
  }

  const reasonLabel =
    reasonModal?.status === 'IN_PROGRESS' && ticket.status === 'CLOSED'
      ? 'Motivo de reapertura (obligatorio)'
      : reasonModal?.type === 'escalate'
        ? 'Motivo del escalamiento (obligatorio)'
        : 'Motivo del cambio (obligatorio)'

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-brand-navy">Acciones</h3>
      {actionError && <p className="text-sm text-brand-scarlet">{actionError}</p>}
      <div className="flex flex-wrap gap-2">
        {statusButtons.map((status) => (
          <button
            key={status}
            type="button"
            disabled={loading || actionLoading}
            onClick={() => void handleStatusClick(status)}
            className="rounded-lg border border-brand-teal px-3 py-1.5 text-sm font-medium text-brand-teal hover:bg-brand-teal/10 disabled:opacity-50"
          >
            {ticket.status === 'CLOSED' && status === 'IN_PROGRESS'
              ? 'Reabrir'
              : (STATUS_ACTION_LABELS[status] ?? status)}
          </button>
        ))}
        {canEscalate && (
          <button
            type="button"
            disabled={loading || actionLoading}
            onClick={() => setReasonModal({ type: 'escalate', status: 'ESCALATED' })}
            className="rounded-lg border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          >
            Escalar
          </button>
        )}
        {canClose && (
          <button
            type="button"
            disabled={loading || actionLoading}
            onClick={() => setConfirmClose(true)}
            className="rounded-lg bg-brand-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
          >
            Cerrar ticket
          </button>
        )}
      </div>

      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => void handleCloseConfirm()}
        title="Cerrar ticket"
        message="¿Confirmas que deseas cerrar este ticket? Esta acción indica que el problema fue resuelto satisfactoriamente."
        confirmLabel="Cerrar"
        loading={actionLoading}
      />

      <Modal
        open={!!reasonModal}
        onClose={() => {
          setReasonModal(null)
          setReason('')
          setReasonError('')
        }}
        title={reasonModal?.type === 'escalate' ? 'Escalar ticket' : 'Motivo del cambio'}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setReasonModal(null)
                setReason('')
                setReasonError('')
              }}
              className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
              disabled={actionLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleReasonConfirm()}
              disabled={actionLoading || !reason.trim()}
              className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
            >
              {actionLoading ? 'Procesando...' : 'Confirmar'}
            </button>
          </>
        }
      >
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={LIMITS.REASON}
          placeholder={`${reasonLabel}...`}
          className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
        />
        {reasonError && <p className="mt-2 text-sm text-brand-scarlet">{reasonError}</p>}
      </Modal>
    </div>
  )
}
