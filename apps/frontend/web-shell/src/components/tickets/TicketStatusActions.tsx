import { useState } from 'react'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import type { Ticket, TicketStatus } from '@/types/ticket.types'
import {
  getAllowedTransitions,
  STATUS_ACTION_LABELS,
} from '@/utils/ticket-state-machine'
import { ConfirmModal, Modal } from '@/components/common/Modal'

interface TicketStatusActionsProps {
  ticket: Ticket
  onChangeStatus: (status: TicketStatus, reason?: string) => Promise<void>
  onEscalate: (reason: string) => Promise<void>
  onClose: () => Promise<void>
  loading?: boolean
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
  const [confirmClose, setConfirmClose] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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
      (user.role === 'SUPERVISOR' || user.role === 'ADMIN') &&
      ticket.status === 'RESOLVED')

  const handleStatusClick = async (status: TicketStatus) => {
    if (status === 'ESCALATED' || status === 'CANCELLED' || status === 'WAITING_USER') {
      setReasonModal({ type: status === 'ESCALATED' ? 'escalate' : 'status', status })
      return
    }
    setActionLoading(true)
    try {
      await onChangeStatus(status)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReasonConfirm = async () => {
    if (!reasonModal) return
    if (reasonModal.type === 'escalate' && !reason.trim()) return
    setActionLoading(true)
    try {
      if (reasonModal.type === 'escalate') {
        await onEscalate(reason.trim())
      } else if (reasonModal.status) {
        await onChangeStatus(reasonModal.status, reason.trim() || undefined)
      }
      setReasonModal(null)
      setReason('')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseConfirm = async () => {
    setActionLoading(true)
    try {
      await onClose()
      setConfirmClose(false)
    } finally {
      setActionLoading(false)
    }
  }

  const statusButtons = allowed.filter((s) => s !== 'ESCALATED' && s !== 'CLOSED')

  if (statusButtons.length === 0 && !canEscalate && !canClose) {
    return null
  }

  const reasonRequired = reasonModal?.type === 'escalate'

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-brand-navy">Acciones</h3>
      <div className="flex flex-wrap gap-2">
        {statusButtons.map((status) => (
          <button
            key={status}
            type="button"
            disabled={loading || actionLoading}
            onClick={() => void handleStatusClick(status)}
            className="rounded-lg border border-brand-teal px-3 py-1.5 text-sm font-medium text-brand-teal hover:bg-brand-teal/10 disabled:opacity-50"
          >
            {STATUS_ACTION_LABELS[status] ?? status}
          </button>
        ))}
        {canEscalate && (
          <button
            type="button"
            disabled={loading || actionLoading}
            onClick={() => setReasonModal({ type: 'escalate' })}
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
        }}
        title={reasonModal?.type === 'escalate' ? 'Escalar ticket' : 'Motivo del cambio'}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setReasonModal(null)
                setReason('')
              }}
              className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
              disabled={actionLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleReasonConfirm()}
              disabled={actionLoading || (reasonRequired && !reason.trim())}
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
          placeholder={
            reasonModal?.type === 'escalate'
              ? 'Motivo del escalamiento (obligatorio)...'
              : 'Motivo opcional...'
          }
          className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
        />
      </Modal>
    </div>
  )
}
