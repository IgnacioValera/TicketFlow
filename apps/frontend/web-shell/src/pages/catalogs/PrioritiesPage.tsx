import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { ColorField } from '@/components/common/ColorField'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { FormAlert } from '@/components/common/FormAlert'
import { Modal } from '@/components/common/Modal'
import { TableActionButton } from '@/components/common/TableActionButton'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { LIMITS } from '@/constants/validation'
import { usePermissions } from '@/hooks/usePermissions'
import * as prioritiesService from '@/services/priorities.service'
import type { CatalogStatus, Priority, PriorityLevel } from '@/types/catalog.types'
import { PRIORITY_DEFAULT_COLORS, isHexColor, normalizeHexColor } from '@/utils/color'
import { getErrorMessages, isValidationError } from '@/utils/errors'

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

type PriorityFormState = {
  name: string
  level: PriorityLevel
  color: string
  description: string
}

const INITIAL_FORM: PriorityFormState = {
  name: '',
  level: 'MEDIUM',
  color: PRIORITY_DEFAULT_COLORS.MEDIUM,
  description: '',
}

function focusField(id: string) {
  document.getElementById(id)?.focus()
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
  const [formAlertTitle, setFormAlertTitle] = useState('')
  const [formMessages, setFormMessages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormState(INITIAL_FORM)
    setFormAlertTitle('')
    setFormMessages([])
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
      color: isHexColor(priority.color)
        ? normalizeHexColor(priority.color)
        : PRIORITY_DEFAULT_COLORS[priority.level],
      description: priority.description ?? '',
    })
    setFormAlertTitle('')
    setFormMessages([])
    setFormOpen(true)
  }

  const closeFormModal = () => {
    setFormOpen(false)
    resetForm()
  }

  const showFormError = (title: string, messages: string[], fieldId?: string) => {
    setFormAlertTitle(title)
    setFormMessages(messages)
    if (fieldId) focusField(fieldId)
  }

  const handleLevelChange = (level: PriorityLevel) => {
    setFormState((prev) => {
      const previousDefault = PRIORITY_DEFAULT_COLORS[prev.level]
      const shouldFollowLevel =
        !editingPriority && normalizeHexColor(prev.color) === previousDefault
      return {
        ...prev,
        level,
        color: shouldFollowLevel ? PRIORITY_DEFAULT_COLORS[level] : prev.color,
      }
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const name = formState.name.trim()
    const description = formState.description.trim()
    const color = normalizeHexColor(formState.color)
    const validationTitle = 'Revisa los datos ingresados'

    if (!name) {
      showFormError(validationTitle, ['El nombre es obligatorio'], 'priority-name')
      return
    }
    if (name.length > LIMITS.PRIORITY_NAME) {
      showFormError(
        validationTitle,
        [`El nombre no puede superar ${LIMITS.PRIORITY_NAME} caracteres`],
        'priority-name',
      )
      return
    }
    if (!isHexColor(color)) {
      showFormError(
        validationTitle,
        ['El color debe tener formato hexadecimal, por ejemplo #2563EB.'],
        'color',
      )
      return
    }
    if (formState.description && !description) {
      showFormError(
        validationTitle,
        ['La descripción no puede contener solo espacios'],
        'priority-description',
      )
      return
    }
    if (description.length > LIMITS.CATALOG_DESCRIPTION) {
      showFormError(
        validationTitle,
        [`La descripción no puede superar ${LIMITS.CATALOG_DESCRIPTION} caracteres`],
        'priority-description',
      )
      return
    }

    setSaving(true)
    setFormAlertTitle('')
    setFormMessages([])

    try {
      const payload = {
        name,
        level: formState.level,
        color,
        ...(description ? { description } : {}),
      }

      if (editingPriority) {
        await prioritiesService.updatePriority(editingPriority.id, payload)
      } else {
        await prioritiesService.createPriority(payload)
      }

      closeFormModal()
      await loadPriorities()
    } catch (err: unknown) {
      const fallback = editingPriority
        ? 'No se pudo actualizar la prioridad'
        : 'No se pudo crear la prioridad'
      showFormError(
        isValidationError(err) ? validationTitle : fallback,
        getErrorMessages(err, fallback),
        isHexColor(color) ? 'priority-name' : 'color',
      )
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
              className="inline-block h-4 w-4 rounded-full border border-border"
              style={{ backgroundColor: row.color }}
              title={row.color}
              aria-hidden
            />
            <span>{row.name}</span>
          </span>
        ),
      },
      {
        key: 'level',
        header: 'Nivel',
        render: (row) => LEVEL_LABELS[row.level],
      },
      {
        key: 'color',
        header: 'Color',
        render: (row) => (
          <span className="font-mono text-xs uppercase text-muted">{row.color}</span>
        ),
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
          <TableActionButton
            label={`Editar prioridad ${row.name}`}
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
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <input
            type="search"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CatalogStatus | '')
            setPage(1)
          }}
          className="w-44 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-brand-navy"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activa</option>
          <option value="INACTIVE">Inactiva</option>
        </select>
        <div className="ml-auto">
          <PrimaryButton onClick={openCreateModal} disabled={!canManage}>
            <AppIcon name="plus" className="h-4 w-4" />
            Nueva prioridad
          </PrimaryButton>
        </div>
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
            <SecondaryButton onClick={closeFormModal} disabled={saving}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="submit" form="priority-form" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </PrimaryButton>
          </>
        }
      >
        <form
          id="priority-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <FormAlert title={formAlertTitle} messages={formMessages} />

          <div>
            <label htmlFor="priority-name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input
              id="priority-name"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded border border-border px-3 py-2 text-sm"
              maxLength={LIMITS.PRIORITY_NAME}
            />
          </div>

          <div>
            <label htmlFor="priority-level" className="mb-1 block text-sm font-medium">
              Nivel
            </label>
            <select
              id="priority-level"
              value={formState.level}
              onChange={(e) => handleLevelChange(e.target.value as PriorityLevel)}
              className="w-full rounded border border-border px-3 py-2 text-sm"
            >
              {(Object.keys(LEVEL_LABELS) as PriorityLevel[]).map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          <ColorField
            value={formState.color}
            onChange={(color) => setFormState((prev) => ({ ...prev, color }))}
          />

          <div>
            <label htmlFor="priority-description" className="mb-1 block text-sm font-medium">
              Descripción
            </label>
            <textarea
              id="priority-description"
              value={formState.description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-24 w-full rounded border border-border px-3 py-2 text-sm"
              maxLength={LIMITS.CATALOG_DESCRIPTION}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
