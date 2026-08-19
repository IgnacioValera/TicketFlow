import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import type { Category, Priority } from '@/types/catalog.types'
import { LIMITS } from '@/constants/validation'
import * as categoriesService from '@/services/categories.service'
import * as crm from '@/services/crm.service'
import * as prioritiesService from '@/services/priorities.service'
import type { CrmClient } from '@/types/crm.types'
import { errorMessage } from '@/utils/validation'
import {
  normalizeTicketForm,
  validateTicketForm,
  type TicketFormValues,
} from '@/utils/ticket-form'

export type { TicketFormValues }

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
  clientId: '',
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
  const [clients, setClients] = useState<CrmClient[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setCatalogError('')
      try {
        const [catRes, priRes, clientRes] = await Promise.all([
          categoriesService.getCategories({ status: 'ACTIVE', perPage: 100 }),
          prioritiesService.getPriorities({ status: 'ACTIVE', perPage: 100 }),
          crm.getClients({ perPage: 100, status: 'ACTIVE' }).catch(() => ({ data: [] as CrmClient[] })),
        ])
        setCategories(catRes.data.filter((c) => c.status === 'ACTIVE'))
        setPriorities(priRes.data.filter((p) => p.status === 'ACTIVE'))
        setClients(clientRes.data)
      } catch (err: unknown) {
        setCatalogError(errorMessage(err, 'No se pudieron cargar los catálogos'))
      } finally {
        setCatalogLoading(false)
      }
    }
    void load()
  }, [])

  const catalogsReady = categories.length > 0 && priorities.length > 0
  const isBusy = loading || isSubmitting

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting || loading) return

    setError('')
    const validationError = validateTicketForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!catalogsReady) {
      setError('No hay categorías o prioridades activas disponibles para crear el ticket')
      return
    }
    if (!categories.some((c) => c.id === values.categoryId)) {
      setError('La categoría seleccionada no está activa')
      return
    }
    if (!priorities.some((p) => p.id === values.priorityId)) {
      setError('La prioridad seleccionada no está activa')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(normalizeTicketForm(values))
    } catch (err: unknown) {
      setError(errorMessage(err, 'No se pudo guardar el ticket'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (catalogLoading) {
    return <p className="text-sm text-slate-500">Cargando catálogos...</p>
  }

  if (catalogError) {
    return <EmptyState title="No se pudieron cargar los catálogos" description={catalogError} />
  }

  if (!catalogsReady) {
    return (
      <EmptyState
        title="No hay catálogos activos"
        description="Se requiere al menos una categoría y una prioridad activas para crear tickets. Contacta al administrador."
        action={
          onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
            >
              Volver al listado
            </button>
          ) : undefined
        }
      />
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      {error && (
        <div
          className="rounded-lg border border-brand-scarlet/30 bg-red-50 px-3 py-2 text-sm text-brand-scarlet"
          role="alert"
        >
          {error}
        </div>
      )}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor="title" className="text-sm font-medium text-brand-navy">
            Título
          </label>
          <span className="text-xs text-slate-500">
            {values.title.trim().length}/{LIMITS.TICKET_TITLE}
          </span>
        </div>
        <input
          id="title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          maxLength={LIMITS.TICKET_TITLE}
          required
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor="description" className="text-sm font-medium text-brand-navy">
            Descripción
          </label>
          <span className="text-xs text-slate-500">
            {values.description.trim().length}/{LIMITS.TICKET_DESCRIPTION}
          </span>
        </div>
        <textarea
          id="description"
          rows={4}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          maxLength={LIMITS.TICKET_DESCRIPTION}
          required
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
            required
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
            required
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
      <div>
        <label htmlFor="clientId" className="mb-1 block text-sm font-medium text-brand-navy">
          Cliente (opcional)
        </label>
        <select
          id="clientId"
          value={values.clientId ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, clientId: e.target.value }))}
          className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Sin cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isBusy}
          className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? 'Guardando...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
