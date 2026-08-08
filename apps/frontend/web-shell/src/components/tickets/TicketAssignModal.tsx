import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import * as usersService from '@/services/users.service'
import type { User } from '@/types/user.types'

interface TicketAssignModalProps {
  open: boolean
  onClose: () => void
  onAssign: (assigneeId: string) => Promise<void>
  currentAssigneeId?: string | null
}

export function TicketAssignModal({
  open,
  onClose,
  onAssign,
  currentAssigneeId,
}: TicketAssignModalProps) {
  const [agents, setAgents] = useState<User[]>([])
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        const response = await usersService.getUsers({
          role: 'AGENT',
          status: 'ACTIVE',
          perPage: 100,
        })
        setAgents(response.data)
        setAssigneeId(currentAssigneeId ?? response.data[0]?.id ?? '')
      } catch {
        setError('No se pudieron cargar los agentes')
      }
    }
    void load()
  }, [open, currentAssigneeId])

  const handleSubmit = async () => {
    if (!assigneeId) return
    setLoading(true)
    setError('')
    try {
      await onAssign(assigneeId)
      onClose()
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al asignar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={currentAssigneeId ? 'Reasignar agente' : 'Asignar agente'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || !assigneeId}
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
          >
            {loading ? 'Asignando...' : 'Asignar'}
          </button>
        </>
      }
    >
      {error && <p className="mb-3 text-sm text-brand-scarlet">{error}</p>}
      <label htmlFor="assignee" className="mb-1 block text-sm font-medium text-brand-navy">
        Agente
      </label>
      <select
        id="assignee"
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
      >
        <option value="">Seleccionar agente...</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.fullName}
          </option>
        ))}
      </select>
    </Modal>
  )
}
