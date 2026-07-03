import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as prioritiesService from '@/services/priorities.service'
import * as slaPoliciesService from '@/services/sla-policies.service'
import type { CatalogStatus, Priority, SlaPolicy } from '@/types/catalog.types'

const STATUS_LABELS: Record<CatalogStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}

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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CatalogStatus | ''>('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })

  const [formOpen, setFormOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null)
  const [formState, setFormState] = useState<SlaPolicyFormState>(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormState(INITIAL_FORM)
    setFormError('')
    setEditingPolicy(null)
  }

  const loadPolicies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await slaPoliciesService.getSlaPolicies({
        page,
        perPage: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setPolicies(response.data)
      if (response.meta) setMeta(response.meta)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al cargar políticas SLA')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

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
      priorityId: priorities[0]?.id ?? '',
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
    if (!formState.priorityId) {
      setFormError('Selecciona una prioridad')
      return
    }
    if (!Number.isFinite(responseHours) || responseHours <= 0) {
      setFormError('Las horas de respuesta deben ser mayores a 0')
      return
    }
    if (!Number.isFinite(resolutionHours) || resolutionHours <= 0) {
      setFormError('Las horas de resolución deben ser mayores a 0')
      return
    }
    if (resolutionHours < responseHours) {
      setFormError('La resolución no puede ser menor que la respuesta')
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
      setFormError((err as { message?: string }).message || 'No se pudo guardar la política SLA')
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
        key: 'status',
        header: 'Estado',
        render: (row) => STATUS_LABELS[row.status],
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (row) => (
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="text-sm text-brand-teal hover:underline"
            disabled={!canManage}
          >
            Editar
          </button>
        ),
      },
    ],
    [canManage],
  )

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Políticas SLA</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tiempos de respuesta y resolución por prioridad.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!canManage || priorities.length === 0}
          className="inline-flex justify-center rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nueva política
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CatalogStatus | '')
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activa</option>
          <option value="INACTIVE">Inactiva</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void loadPolicies()} />
      ) : (
        <DataTable
          columns={columns}
          data={policies}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          emptyMessage="No se encontraron políticas SLA"
        />
      )}

      <Modal
        open={formOpen}
        onClose={closeFormModal}
        title={editingPolicy ? 'Editar política SLA' : 'Nueva política SLA'}
        footer={
          <>
            <button
              type="button"
              onClick={closeFormModal}
              disabled={saving}
              className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="sla-policy-form"
              disabled={saving}
              className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="sla-policy-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          {formError && <ErrorState message={formError} />}

          <div>
            <label htmlFor="sla-name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input
              id="sla-name"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
              maxLength={80}
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
              {priorities.map((priority) => (
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
