import { useEffect, useState, type FormEvent } from 'react'
import type { Category } from '@/types/catalog.types'
import type { Priority } from '@/types/catalog.types'
import * as categoriesService from '@/services/categories.service'
import * as prioritiesService from '@/services/priorities.service'

export interface TicketFormValues {
  title: string
  description: string
  categoryId: string
  priorityId: string
}

interface TicketFormProps {
  initialValues?: Partial<TicketFormValues>
  submitLabel?: string
  loading?: boolean
  onSubmit: (values: TicketFormValues) => Promise<void>
  onCancel?: () => void
}

const EMPTY: TicketFormValues = {
  title: '',
  description: '',
  categoryId: '',
  priorityId: '',
}

export function TicketForm({
  initialValues,
  submitLabel = 'Guardar',
  loading = false,
  onSubmit,
  onCancel,
}: TicketFormProps) {
  const [values, setValues] = useState<TicketFormValues>({ ...EMPTY, ...initialValues })
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, priRes] = await Promise.all([
          categoriesService.getCategories({ status: 'ACTIVE', perPage: 100 }),
          prioritiesService.getPriorities({ status: 'ACTIVE', perPage: 100 }),
        ])
        setCategories(catRes.data.filter((c) => c.status === 'ACTIVE'))
        setPriorities(priRes.data.filter((p) => p.status === 'ACTIVE'))
      } finally {
        setCatalogLoading(false)
      }
    }
    void load()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!values.title.trim() || !values.description.trim()) {
      setError('Título y descripción son obligatorios')
      return
    }
    if (!values.categoryId || !values.priorityId) {
      setError('Selecciona categoría y prioridad')
      return
    }
    await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      categoryId: values.categoryId,
      priorityId: values.priorityId,
    })
  }

  if (catalogLoading) {
    return <p className="text-sm text-slate-500">Cargando catálogos...</p>
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-brand-scarlet/30 bg-red-50 px-3 py-2 text-sm text-brand-scarlet">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-brand-navy">
          Título
        </label>
        <input
          id="title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          maxLength={150}
        />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-brand-navy">
          Descripción
        </label>
        <textarea
          id="description"
          rows={4}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-brand-navy">
            Categoría
          </label>
          <select
            id="categoryId"
            value={values.categoryId}
            onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priorityId" className="mb-1 block text-sm font-medium text-brand-navy">
            Prioridad
          </label>
          <select
            id="priorityId"
            value={values.priorityId}
            onChange={(e) => setValues((v) => ({ ...v, priorityId: e.target.value }))}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
