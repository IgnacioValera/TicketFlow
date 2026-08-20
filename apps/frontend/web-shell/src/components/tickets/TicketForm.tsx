import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { useAuth } from '@/hooks/useAuth'
import type { Category, Priority } from '@/types/catalog.types'
import type { User } from '@/types/user.types'
import { LIMITS } from '@/constants/validation'
import * as categoriesService from '@/services/categories.service'
import * as prioritiesService from '@/services/priorities.service'
import * as usersService from '@/services/users.service'
import { REQUESTER_UNLINKED } from '@/utils/notifications'
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
  requesterId: '',
}

const PORTAL_ROLES = new Set(['CLIENT', 'REQUESTER'])

export function TicketForm({
  initialValues,
  submitLabel = 'Guardar',
  loading = false,
  onSubmit,
  onCancel,
}: TicketFormProps) {
  const { user } = useAuth()
  const isPortal = Boolean(user && PORTAL_ROLES.has(user.role))
  const canChooseRequester = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'
  const [values, setValues] = useState<TicketFormValues>({ ...EMPTY, ...initialValues })
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [requesters, setRequesters] = useState<User[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setCatalogError('')
      try {
        const [catRes, priRes, requesterRes] = await Promise.all([
          categoriesService.getCategories({ status: 'ACTIVE', perPage: 100 }),
          prioritiesService.getPriorities({ status: 'ACTIVE', perPage: 100 }),
          canChooseRequester
            ? usersService.getRequesters().catch(() => ({ data: [] as User[] }))
            : Promise.resolve({ data: [] as User[] }),
        ])
        setCategories(catRes.data.filter((c) => c.status === 'ACTIVE'))
        setPriorities(priRes.data.filter((p) => p.status === 'ACTIVE'))
        setRequesters(requesterRes.data)
      } catch (err: unknown) {
        setCatalogError(errorMessage(err, 'No se pudieron cargar los catálogos'))
      } finally {
        setCatalogLoading(false)
      }
    }
    void load()
  }, [canChooseRequester])

  const catalogsReady = categories.length > 0 && priorities.length > 0
  const isBusy = loading || isSubmitting
  const selectedRequester = requesters.find((item) => item.id === values.requesterId)
  const portalUnlinked = isPortal && !user?.clientId

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting || loading) return
    setError('')
    if (portalUnlinked) {
      setError(REQUESTER_UNLINKED)
      return
    }
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
      const payload = normalizeTicketForm({
        ...values,
        clientId: undefined,
        requesterId: isPortal ? undefined : values.requesterId,
      })
      await onSubmit(payload)
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
          <SearchableSelect
            id="categoryId"
            value={values.categoryId}
            onChange={(categoryId) => setValues((v) => ({ ...v, categoryId }))}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Seleccionar..."
            searchPlaceholder="Buscar categoría..."
            emptyMessage="No hay categorías disponibles"
            noResultsMessage="Ninguna categoría coincide con la búsqueda"
          />
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
      {isPortal && (
        <div>
          <p className="mb-1 text-sm font-medium text-brand-navy">Cliente</p>
          <p className="rounded-lg border border-brand-slate bg-page px-3 py-2 text-sm">
            {user?.clientName || 'Sin cliente asignado'}
          </p>
          {portalUnlinked && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {REQUESTER_UNLINKED}
            </p>
          )}
        </div>
      )}
      {canChooseRequester && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="requesterId" className="mb-1 block text-sm font-medium text-brand-navy">
              Solicitante
            </label>
            <SearchableSelect
              id="requesterId"
              value={values.requesterId ?? ''}
              onChange={(requesterId) => setValues((v) => ({ ...v, requesterId }))}
              options={requesters.map((item) => ({ value: item.id, label: item.fullName }))}
              placeholder="Crear a mi nombre"
              searchPlaceholder="Buscar solicitante..."
              emptyMessage="No hay solicitantes disponibles"
              noResultsMessage="Ningún solicitante coincide con la búsqueda"
              allowEmpty
              emptyLabel="Crear a mi nombre"
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-brand-navy">Cliente</p>
            <p className="rounded-lg border border-brand-slate bg-page px-3 py-2 text-sm">
              {selectedRequester?.clientName || 'Se deriva del solicitante'}
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isBusy || portalUnlinked}
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
