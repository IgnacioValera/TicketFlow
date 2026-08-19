import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ColorField } from '@/components/common/ColorField'
import { ConfirmModal, Modal } from '@/components/common/Modal'
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
import type { CatalogStatus, Priority, PriorityLevel } from '@/types/catalog.types'
import { PRIORITY_DEFAULT_COLORS, isHexColor, normalizeHexColor } from '@/utils/color'
import { getErrorMessages, isValidationError } from '@/utils/errors'
import {
  availablePriorityLevels,
  buildPriorityPayload,
  validatePriorityForm,
  type PriorityFormValues,
} from '@/utils/priority-form'

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

const INITIAL_FORM: PriorityFormValues = {
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
  const [formState, setFormState] = useState<PriorityFormValues>(INITIAL_FORM)
  const [formAlertTitle, setFormAlertTitle] = useState('')
  const [formMessages, setFormMessages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [statusTarget, setStatusTarget] = useState<{
    priority: Priority
    status: CatalogStatus
  } | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [activeLevels, setActiveLevels] = useState<PriorityLevel[]>([])

  const refreshActiveLevels = useCallback(async () => {
    const response = await prioritiesService.getPriorities({ status: 'ACTIVE', perPage: 100 })
    setActiveLevels(response.data.map((priority) => priority.level))
  }, [])

  const availableLevels = useMemo(
    () => availablePriorityLevels(activeLevels, editingPriority?.level),
    [activeLevels, editingPriority?.level],
  )

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

  const showFormError = (title: string, messages: string[], fieldId?: string) => {
    setFormAlertTitle(title)
    setFormMessages(messages)
    if (fieldId) focusField(fieldId)
  }

  const openCreateModal = () => {
    resetForm()
    void (async () => {
      const response = await prioritiesService.getPriorities({ status: 'ACTIVE', perPage: 100 })
      const levels = response.data.map((priority) => priority.level)
      setActiveLevels(levels)
      const available = availablePriorityLevels(levels)
      const defaultLevel = available[0] ?? INITIAL_FORM.level
      setFormState({
        ...INITIAL_FORM,
        level: defaultLevel,
        color: PRIORITY_DEFAULT_COLORS[defaultLevel],
      })
      if (available.length === 0) {
        showFormError(
          'No hay niveles disponibles',
          ['Desactiva una prioridad existente para reutilizar su nivel.'],
          'priority-level',
        )
      }
      setFormOpen(true)
    })()
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
    void refreshActiveLevels()
    setFormOpen(true)
  }

  useEffect(() => {
    if (!formOpen || editingPriority) return
    const nextLevel = availableLevels[0]
    if (!nextLevel) return
    setFormState((prev) =>
      availableLevels.includes(prev.level)
        ? prev
        : {
            ...prev,
            level: nextLevel,
            color: PRIORITY_DEFAULT_COLORS[nextLevel],
          },
    )
  }, [availableLevels, editingPriority, formOpen])

  const closeFormModal = () => {
    setFormOpen(false)
    resetForm()
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
    const validationTitle = 'Revisa los datos ingresados'
    const validationError = validatePriorityForm(formState)
    if (validationError) {
      const fieldId =
        validationError.includes('color') || validationError.includes('hexadecimal')
          ? 'color'
          : validationError.includes('descripción')
            ? 'priority-description'
            : validationError.includes('nivel')
              ? 'priority-level'
              : 'priority-name'
      showFormError(validationTitle, [validationError], fieldId)
      return
    }

    if (!editingPriority && !availableLevels.includes(formState.level)) {
      showFormError(
        validationTitle,
        ['Ya existe una prioridad activa con ese nivel. Desactiva la actual o elige otro nivel.'],
        'priority-level',
      )
      return
    }

    if (!editingPriority && availableLevels.length === 0) {
      showFormError(
        'No hay niveles disponibles',
        ['Desactiva una prioridad existente para reutilizar su nivel.'],
        'priority-level',
      )
      return
    }

    setSaving(true)
    setFormAlertTitle('')
    setFormMessages([])

    try {
      const payload = buildPriorityPayload(formState)

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
      const color = normalizeHexColor(formState.color)
      showFormError(
        isValidationError(err) ? validationTitle : fallback,
        getErrorMessages(err, fallback),
        getErrorMessages(err, fallback).some((message) => /nivel/i.test(message))
          ? 'priority-level'
          : isHexColor(color)
            ? 'priority-name'
            : 'color',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async () => {
    if (!statusTarget) return

    setStatusSaving(true)
    try {
      await prioritiesService.updatePriorityStatus(statusTarget.priority.id, statusTarget.status)
      setStatusTarget(null)
      await loadPriorities()
    } catch (err: unknown) {
      setError(
        (err as { message?: string }).message || 'No se pudo actualizar el estado de la prioridad',
      )
    } finally {
      setStatusSaving(false)
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
          <div className="flex flex-wrap gap-2">
            <TableActionButton
              label={`Editar prioridad ${row.name}`}
              icon="edit"
              onClick={() => openEditModal(row)}
              disabled={!canManage}
            />
            {row.status === 'ACTIVE' ? (
              <TableActionButton
                label={`Desactivar prioridad ${row.name}`}
                variant="warning"
                icon="pause"
                onClick={() => setStatusTarget({ priority: row, status: 'INACTIVE' })}
                disabled={!canManage}
              />
            ) : (
              <TableActionButton
                label={`Activar prioridad ${row.name}`}
                variant="success"
                icon="check"
                onClick={() => setStatusTarget({ priority: row, status: 'ACTIVE' })}
                disabled={!canManage}
              />
            )}
          </div>
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
          title="Prioridades"
          description="Define impacto, severidad y orden de atención."
          actions={
            <PrimaryButton onClick={openCreateModal} disabled={!canManage}>
              Nueva prioridad
            </PrimaryButton>
          }
        />
      </div>

      <div className="ui-card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="rounded border border-border px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CatalogStatus | '')
            setPage(1)
          }}
          className="rounded border border-border px-3 py-2 text-sm"
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
            <SecondaryButton onClick={closeFormModal} disabled={saving}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="submit" form="priority-form" disabled={saving || (!editingPriority && availableLevels.length === 0)}>
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
                <option key={level} value={level} disabled={!availableLevels.includes(level)}>
                  {LEVEL_LABELS[level]}
                  {!availableLevels.includes(level) ? ' (ocupado)' : ''}
                </option>
              ))}
            </select>
            {!editingPriority && availableLevels.length === 0 && (
              <p className="mt-1 text-xs text-muted">
                Todos los niveles están en uso. Desactiva una prioridad existente para crear otra.
              </p>
            )}
            {!editingPriority && availableLevels.length > 0 && availableLevels.length < 4 && (
              <p className="mt-1 text-xs text-muted">
                Solo puedes usar niveles sin una prioridad activa.
              </p>
            )}
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

      <ConfirmModal
        open={!!statusTarget}
        onClose={() => {
          if (!statusSaving) setStatusTarget(null)
        }}
        onConfirm={() => void handleStatusChange()}
        title={statusTarget?.status === 'ACTIVE' ? 'Activar prioridad' : 'Desactivar prioridad'}
        message={
          statusTarget
            ? `¿Deseas ${statusTarget.status === 'ACTIVE' ? 'activar' : 'desactivar'} la prioridad ${statusTarget.priority.name}?`
            : ''
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Activar' : 'Desactivar'}
        loading={statusSaving}
      />
    </div>
  )
}
