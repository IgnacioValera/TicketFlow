import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { ConfirmModal, Modal } from '@/components/common/Modal'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { FormAlert } from '@/components/common/FormAlert'
import { TableActionButton } from '@/components/common/TableActionButton'
import { PrimaryButton, SecondaryButton, SelectInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { LIMITS } from '@/constants/validation'
import { usePermissions } from '@/hooks/usePermissions'
import * as categoriesService from '@/services/categories.service'
import type { CatalogStatus, Category } from '@/types/catalog.types'
import { getErrorMessages } from '@/utils/errors'

const STATUS_LABELS: Record<CatalogStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}

type CategoryFormState = {
  name: string
  description: string
}

const INITIAL_FORM: CategoryFormState = {
  name: '',
  description: '',
}

export function CategoriesPage() {
  const { hasPermission } = usePermissions()
  const canManage = hasPermission(PERMISSIONS.CATEGORY_MANAGE)

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CatalogStatus | ''>('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formState, setFormState] = useState<CategoryFormState>(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [statusTarget, setStatusTarget] = useState<{
    category: Category
    status: CatalogStatus
  } | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)

  const resetForm = () => {
    setFormState(INITIAL_FORM)
    setFormError('')
    setEditingCategory(null)
  }

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await categoriesService.getCategories({
        page,
        perPage,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setCategories(response.data)
      if (response.meta) setMeta(response.meta)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, statusFilter])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const openCreateModal = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setFormState({
      name: category.name,
      description: category.description,
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
    if (name.length > LIMITS.CATEGORY_NAME) {
      setFormError(`El nombre no puede superar ${LIMITS.CATEGORY_NAME} caracteres`)
      return
    }
    if (formState.description && !description) {
      setFormError('La descripción no puede contener solo espacios')
      return
    }
    if (description.length > LIMITS.CATALOG_DESCRIPTION) {
      setFormError(`La descripción no puede superar ${LIMITS.CATALOG_DESCRIPTION} caracteres`)
      return
    }

    setSaving(true)
    setFormError('')

    try {
      const wasEditing = Boolean(editingCategory)
      if (editingCategory) {
        await categoriesService.updateCategory(editingCategory.id, {
          name,
          ...(description ? { description } : {}),
        })
      } else {
        await categoriesService.createCategory({
          name,
          ...(description ? { description } : {}),
        })
      }

      closeFormModal()
      await loadCategories()
      setToast({
        title: wasEditing ? 'Categoría actualizada' : 'Categoría creada',
        message: wasEditing
          ? `${name} se actualizó correctamente.`
          : `${name} se agregó al catálogo.`,
      })
    } catch (err: unknown) {
      setFormError(getErrorMessages(err, 'No se pudo guardar la categoría').join(' '))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async () => {
    if (!statusTarget) return

    setStatusSaving(true)
    try {
      await categoriesService.updateCategoryStatus(statusTarget.category.id, statusTarget.status)
      setStatusTarget(null)
      await loadCategories()
    } catch (err: unknown) {
      setError(
        (err as { message?: string }).message || 'No se pudo actualizar el estado de la categoría',
      )
    } finally {
      setStatusSaving(false)
    }
  }

  const columns: Column<Category>[] = useMemo(
    () => [
      { key: 'name', header: 'Nombre', sortable: true },
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
              label={`Editar categoría ${row.name}`}
              icon="edit"
              onClick={() => openEditModal(row)}
              disabled={!canManage}
            />
            {row.status === 'ACTIVE' ? (
              <TableActionButton
                label={`Desactivar categoría ${row.name}`}
                variant="warning"
                icon="pause"
                onClick={() => setStatusTarget({ category: row, status: 'INACTIVE' })}
                disabled={!canManage}
              />
            ) : (
              <TableActionButton
                label={`Activar categoría ${row.name}`}
                variant="success"
                icon="check"
                onClick={() => setStatusTarget({ category: row, status: 'ACTIVE' })}
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
      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
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
        <SelectInput
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CatalogStatus | '')
            setPage(1)
          }}
          className="w-44"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activa</option>
          <option value="INACTIVE">Inactiva</option>
        </SelectInput>
        <div className="ml-auto">
          <PrimaryButton onClick={openCreateModal} disabled={!canManage}>
            <AppIcon name="plus" className="h-4 w-4" />
            Nueva categoría
          </PrimaryButton>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void loadCategories()} />
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          loading={loading}
          pagination={{ ...meta, page, perPage }}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPerPage(value)
            setPage(1)
          }}
          rowKey={(row) => row.id}
          emptyMessage="No se encontraron categorías"
        />
      )}

      <Modal
        open={formOpen}
        onClose={closeFormModal}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <>
            <SecondaryButton onClick={closeFormModal} disabled={saving}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="submit" form="category-form" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </PrimaryButton>
          </>
        }
      >
        <form
          id="category-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          {formError && <FormAlert title="Revisa los datos ingresados" messages={[formError]} />}

          <div>
            <label htmlFor="category-name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input
              id="category-name"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
              maxLength={LIMITS.CATEGORY_NAME}
            />
          </div>

          <div>
            <label htmlFor="category-description" className="mb-1 block text-sm font-medium">
              Descripción
            </label>
            <textarea
              id="category-description"
              value={formState.description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-24 w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
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
        title={statusTarget?.status === 'ACTIVE' ? 'Activar categoría' : 'Desactivar categoría'}
        message={
          statusTarget
            ? `¿Deseas ${statusTarget.status === 'ACTIVE' ? 'activar' : 'desactivar'} la categoría ${statusTarget.category.name}?`
            : ''
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Activar' : 'Desactivar'}
        variant={statusTarget?.status === 'ACTIVE' ? 'primary' : 'danger'}
        loading={statusSaving}
      />
    </div>
  )
}
