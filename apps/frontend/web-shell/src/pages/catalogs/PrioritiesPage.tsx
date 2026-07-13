import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as prioritiesService from '@/services/priorities.service'
import type { CatalogStatus, Priority, PriorityLevel } from '@/types/catalog.types'

const STATUS_LABELS: Record<CatalogStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}

const LEVEL_LABELS: Record<PriorityLevel, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

const LEVEL_COLORS: Record<PriorityLevel, string> = {
  LOW: 'var(--color-priority-low)',
  MEDIUM: 'var(--color-priority-medium)',
  HIGH: 'var(--color-priority-high)',
  CRITICAL: 'var(--color-priority-critical)',
}

type PriorityFormState = {
  name: string
  level: PriorityLevel
  description: string
}

const INITIAL_FORM: PriorityFormState = {
  name: '',
  level: 'MEDIUM',
  description: '',
}

export function PrioritiesPage() {
  const { hasPermission } = usePermissions()
  const canManage = hasPermission(PERMISSIONS.PRIORITY_MANAGE)

  const [priorities, setPriorities] = useState<Priority[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CatalogStatus | ''>('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })

  const [formOpen, setFormOpen] = useState(false)
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null)
  const [formState, setFormState] = useState<PriorityFormState>(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormState(INITIAL_FORM)
    setFormError('')
    setEditingPriority(null)
  }

  const loadPriorities = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await prioritiesService.getPriorities({
        page,
        perPage: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setPriorities(response.data)
      if (response.meta) setMeta(response.meta)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al cargar prioridades')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    void loadPriorities()
  }, [loadPriorities])

  const openCreateModal = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEditModal = (priority: Priority) => {
    setEditingPriority(priority)
    setFormState({
      name: priority.name,
      level: priority.level,
      description: priority.description,
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
    const description = formState.description.trim()

    if (!name) {
      setFormError('El nombre es obligatorio')
      return
    }

    setSaving(true)
    setFormError('')

    try {
      const payload = {
        name,
        level: formState.level,
        color: LEVEL_COLORS[formState.level],
        description,
      }

      if (editingPriority) {
        await prioritiesService.updatePriority(editingPriority.id, payload)
      } else {
        await prioritiesService.createPriority(payload)
      }

      closeFormModal()
      await loadPriorities()
    } catch (err: unknown) {
      setFormError((err as { message?: string }).message || 'No se pudo guardar la prioridad')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Priority>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        render: (row) => (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden
            />
            {row.name}
          </span>
        ),
      },
      {
        key: 'level',
        header: 'Nivel',
        render: (row) => LEVEL_LABELS[row.level],
      },
      {
        key: 'description',
        header: 'Descripción',
        render: (row) => row.description || 'Sin descripción',
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c8191]">Catálogos</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-navy md:text-3xl">
            Prioridades
          </h1>
          <p className="mt-1 text-sm text-[#766c7c]">
            Define impacto, severidad y orden de atención.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!canManage}
          className="inline-flex justify-center rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(111,79,216,.2)] hover:bg-[#6040c8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nueva prioridad
        </button>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-[#e2dce5] bg-white p-4 shadow-[0_8px_25px_rgba(61,45,69,.04)] sm:grid-cols-2 lg:grid-cols-4">
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
        <ErrorState message={error} onRetry={() => void loadPriorities()} />
      ) : (
        <DataTable
          columns={columns}
          data={priorities}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          emptyMessage="No se encontraron prioridades"
        />
      )}

      <Modal
        open={formOpen}
        onClose={closeFormModal}
        title={editingPriority ? 'Editar prioridad' : 'Nueva prioridad'}
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
              form="priority-form"
              disabled={saving}
              className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <form
          id="priority-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          {formError && <ErrorState message={formError} />}

          <div>
            <label htmlFor="priority-name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input
              id="priority-name"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
              maxLength={50}
            />
          </div>

          <div>
            <label htmlFor="priority-level" className="mb-1 block text-sm font-medium">
              Nivel
            </label>
            <select
              id="priority-level"
              value={formState.level}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, level: e.target.value as PriorityLevel }))
              }
              className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            >
              {(Object.keys(LEVEL_LABELS) as PriorityLevel[]).map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority-description" className="mb-1 block text-sm font-medium">
              Descripción
            </label>
            <textarea
              id="priority-description"
              value={formState.description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-24 w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
              maxLength={250}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
