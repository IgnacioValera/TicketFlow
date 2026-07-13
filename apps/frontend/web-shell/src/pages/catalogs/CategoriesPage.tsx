import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ConfirmModal, Modal } from '@/components/common/Modal'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as categoriesService from '@/services/categories.service'
import type { CatalogStatus, Category } from '@/types/catalog.types'

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
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formState, setFormState] = useState<CategoryFormState>(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deactivateTarget, setDeactivateTarget] = useState<Category | null>(null)
  const [deactivating, setDeactivating] = useState(false)

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
        perPage: 10,
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
  }, [page, search, statusFilter])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

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

    setSaving(true)
    setFormError('')

    try {
      if (editingCategory) {
        await categoriesService.updateCategory(editingCategory.id, {
          name,
          description,
        })
      } else {
        await categoriesService.createCategory({
          name,
          description,
        })
      }

      closeFormModal()
      await loadCategories()
    } catch (err: unknown) {
      setFormError((err as { message?: string }).message || 'No se pudo guardar la categoría')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return

    setDeactivating(true)
    try {
      await categoriesService.deactivateCategory(deactivateTarget.id)
      setDeactivateTarget(null)
      await loadCategories()
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudo desactivar la categoría')
    } finally {
      setDeactivating(false)
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
            <button
              type="button"
              onClick={() => openEditModal(row)}
              className="text-sm text-brand-teal hover:underline"
              disabled={!canManage}
            >
              Editar
            </button>
            {row.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => setDeactivateTarget(row)}
                className="text-sm text-amber-700 hover:underline"
                disabled={!canManage}
              >
                Desactivar
              </button>
            )}
          </div>
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
            Categorías
          </h1>
          <p className="mt-1 text-sm text-[#766c7c]">
            Organiza los tipos de solicitudes de soporte.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!canManage}
          className="inline-flex justify-center rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(111,79,216,.2)] hover:bg-[#6040c8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nueva categoría
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
        <ErrorState message={error} onRetry={() => void loadCategories()} />
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
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
              form="category-form"
              disabled={saving}
              className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <form
          id="category-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          {formError && <ErrorState message={formError} />}

          <div>
            <label htmlFor="category-name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <input
              id="category-name"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
              maxLength={80}
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
              maxLength={250}
            />
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void handleDeactivate()}
        title="Desactivar categoría"
        message={
          deactivateTarget ? `¿Deseas desactivar la categoría ${deactivateTarget.name}?` : ''
        }
        confirmLabel="Desactivar"
        variant="danger"
        loading={deactivating}
      />
    </div>
  )
}
