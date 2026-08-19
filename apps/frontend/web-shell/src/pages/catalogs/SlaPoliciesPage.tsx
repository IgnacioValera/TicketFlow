import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { FormAlert } from '@/components/common/FormAlert'
import { PageHeader } from '@/components/common/PageHeader'
import { TableActionButton } from '@/components/common/TableActionButton'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { LIMITS } from '@/constants/validation'
import { usePermissions } from '@/hooks/usePermissions'
import * as prioritiesService from '@/services/priorities.service'
import * as slaPoliciesService from '@/services/sla-policies.service'
import type { Priority, SlaPolicy } from '@/types/catalog.types'
import { getErrorMessages } from '@/utils/errors'
import { validateSlaHours } from '@/utils/validation'

type SlaPolicyFormState = {
  name: string
  priorityId: string
  responseHours: string
  resolutionHours: string
}

const INITIAL_FORM: SlaPolicyFormState = {
  name: '',
  priorityId: '',
  responseHours: '4',
  resolutionHours: '24',
}

export function SlaPoliciesPage() {
  const { hasPermission } = usePermissions()
  const canManage = hasPermission(PERMISSIONS.SLA_MANAGE)

  const [policies, setPolicies] = useState<SlaPolicy[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null)
  const [formState, setFormState] = useState<SlaPolicyFormState>(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const usedPriorityIds = useMemo(() => new Set(policies.map((policy) => policy.priorityId)), [policies])
  const availablePriorities = useMemo(
    () => priorities.filter((priority) => !usedPriorityIds.has(priority.id)),
    [priorities, usedPriorityIds],
  )
  const formPriorities = useMemo(() => {
    if (!editingPolicy) return availablePriorities
    return priorities.filter(
      (priority) => priority.id === editingPolicy.priorityId || !usedPriorityIds.has(priority.id),
    )
  }, [availablePriorities, editingPolicy, priorities, usedPriorityIds])
  const canCreate = canManage && availablePriorities.length > 0

  const resetForm = () => {
    setFormState(INITIAL_FORM)
    setFormError('')
    setEditingPolicy(null)
  }

  const loadPolicies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await slaPoliciesService.getSlaPolicies({ perPage: 20 })
      setPolicies(response.data)
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'Error al cargar políticas SLA')[0])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPriorities = useCallback(async () => {
    try {
      const response = await prioritiesService.getPriorities({ status: 'ACTIVE', perPage: 50 })
      setPriorities(response.data)
    } catch {
      setPriorities([])
    }
  }, [])

  useEffect(() => {
    void loadPolicies()
  }, [loadPolicies])

  useEffect(() => {
    void loadPriorities()
  }, [loadPriorities])

  const openCreateModal = () => {
    resetForm()
    setFormState({
      ...INITIAL_FORM,
      priorityId: availablePriorities[0]?.id ?? '',
    })
    setFormOpen(true)
  }

  const openEditModal = (policy: SlaPolicy) => {
    setEditingPolicy(policy)
    setFormState({
      name: policy.name,
      priorityId: policy.priorityId,
      responseHours: String(policy.responseHours),
      resolutionHours: String(policy.resolutionHours),
    })
    setFormError('')
    setFormOpen(true)
  }

  const closeFormModal = () => {
    setFormOpen(false)
    resetForm()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const name = formState.name.trim()
    const responseHours = Number(formState.responseHours)
    const resolutionHours = Number(formState.resolutionHours)

    if (!name) {
      setFormError('El nombre es obligatorio')
      return
    }
    if (name.length > LIMITS.SLA_NAME) {
      setFormError(`El nombre no puede superar ${LIMITS.SLA_NAME} caracteres`)
      return
    }
    if (!formState.priorityId) {
      setFormError('Selecciona una prioridad')
      return
    }
    const slaError = validateSlaHours(responseHours, resolutionHours)
    if (slaError) {
      setFormError(slaError)
      return
    }

    setSaving(true)
    setFormError('')

    try {
      const payload = {
        name,
        priorityId: formState.priorityId,
        responseHours,
        resolutionHours,
      }

      if (editingPolicy) {
        await slaPoliciesService.updateSlaPolicy(editingPolicy.id, payload)
      } else {
        await slaPoliciesService.createSlaPolicy(payload)
      }

      closeFormModal()
      await loadPolicies()
    } catch (err: unknown) {
      setFormError(getErrorMessages(err, 'No se pudo guardar la política SLA')[0])
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<SlaPolicy>[] = useMemo(
    () => [
      { key: 'name', header: 'Política' },
      { key: 'priorityName', header: 'Prioridad' },
      {
        key: 'responseHours',
        header: 'Respuesta (h)',
        render: (row) => `${row.responseHours} h`,
      },
      {
        key: 'resolutionHours',
        header: 'Resolución (h)',
        render: (row) => `${row.resolutionHours} h`,
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (row) => (
          <TableActionButton
            label={`Editar política SLA ${row.name}`}
            icon="edit"
            onClick={() => openEditModal(row)}
            disabled={!canManage}
          />
        ),
      },
    ],
    [canManage],
  )

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          kicker="Catálogos"
          title="Políticas SLA"
          description="Tiempos de respuesta y resolución por prioridad."
          actions={
            canCreate ? <PrimaryButton onClick={openCreateModal}>Nueva política</PrimaryButton> : undefined
          }
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void loadPolicies()} />
      ) : (
        <DataTable
          columns={columns}
          data={policies}
          loading={loading}
          rowKey={(row) => row.id}
          emptyMessage="No hay políticas SLA"
          emptyDescription="Crea una política por cada prioridad activa."
          emptyAction={
            canCreate ? <PrimaryButton onClick={openCreateModal}>Nueva política</PrimaryButton> : undefined
          }
        />
      )}

      <Modal
        open={formOpen}
        onClose={closeFormModal}
        title={editingPolicy ? 'Editar política SLA' : 'Nueva política SLA'}
        footer={
          <>
            <SecondaryButton onClick={closeFormModal} disabled={saving}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="submit" form="sla-policy-form" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </PrimaryButton>
          </>
        }
      >
        <form
          id="sla-policy-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          {formError && <FormAlert title="Revisa los datos ingresados" messages={[formError]} />}

          <div>
            <label htmlFor="sla-name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input
              id="sla-name"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
              maxLength={LIMITS.SLA_NAME}
            />
          </div>

          <div>
            <label htmlFor="sla-priority" className="mb-1 block text-sm font-medium">
              Prioridad
            </label>
            <select
              id="sla-priority"
              value={formState.priorityId}
              onChange={(e) => setFormState((prev) => ({ ...prev, priorityId: e.target.value }))}
              className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            >
              <option value="">Seleccionar prioridad</option>
              {formPriorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sla-response" className="mb-1 block text-sm font-medium">
                Horas de respuesta
              </label>
              <input
                id="sla-response"
                type="number"
                min={1}
                value={formState.responseHours}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, responseHours: e.target.value }))
                }
                className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="sla-resolution" className="mb-1 block text-sm font-medium">
                Horas de resolución
              </label>
              <input
                id="sla-resolution"
                type="number"
                min={1}
                value={formState.resolutionHours}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, resolutionHours: e.target.value }))
                }
                className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
