import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { SelectInput } from '@/components/common/UiControls'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SlaSemaphore } from '@/components/tickets/SlaSemaphore'
import { TicketsKanbanBoard } from '@/components/tickets/TicketsKanbanBoard'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useTickets } from '@/hooks/useTickets'
import * as categoriesService from '@/services/categories.service'
import * as prioritiesService from '@/services/priorities.service'
import type { Category, Priority } from '@/types/catalog.types'
import type { Ticket, TicketStatus, SlaFilterStatus, TicketPreset } from '@/types/ticket.types'
import { calculateSlaStatus } from '@/utils/sla.utils'
import { statusesForPreset } from '@/utils/dashboard.utils'

type ListTab = 'all' | 'mine' | 'unassigned'
type ViewMode = 'table' | 'kanban'

function readSearchParam(
  params: URLSearchParams,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = params.get(key)
    if (value) return value
  }
  return null
}

export function TicketsListPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const { tickets, loading, error, loadTickets } = useTickets()
  const [searchParams] = useSearchParams()

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('')
  const [presetFilter, setPresetFilter] = useState<TicketPreset | ''>('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [slaFilter, setSlaFilter] = useState<SlaFilterStatus | ''>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const defaultTab: ListTab = useMemo(() => {
    if (user?.role === 'AGENT') return 'mine'
    if (user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') return 'all'
    return 'all'
  }, [user?.role])

  const [tab, setTab] = useState<ListTab>(defaultTab)

  useEffect(() => {
    const preset = readSearchParam(searchParams, ['preset']) as TicketPreset | null
    const status = readSearchParam(searchParams, ['status']) as TicketStatus | null
    const slaStatus = readSearchParam(searchParams, ['slaStatus', 'sla_status']) as SlaFilterStatus | null
    const searchQuery = readSearchParam(searchParams, ['search'])
    const priorityId = readSearchParam(searchParams, ['priorityId'])
    const categoryId = readSearchParam(searchParams, ['categoryId'])
    const unassigned = searchParams.get('unassigned') === 'true'
    const mine = searchParams.get('mine') === 'true'

    setPresetFilter(preset && statusesForPreset(preset) ? preset : '')
    setStatusFilter(preset ? '' : status ?? '')
    setSlaFilter(slaStatus ?? '')
    setSearch(searchQuery ?? '')
    setPriorityFilter(priorityId ?? '')
    setCategoryFilter(categoryId ?? '')
    setTab(unassigned ? 'unassigned' : mine ? 'mine' : defaultTab)
    setPage(1)
  }, [searchParams, defaultTab])

  useEffect(() => {
    const loadCatalogs = async () => {
      const [catRes, priRes] = await Promise.all([
        categoriesService.getCategories({ status: 'ACTIVE', perPage: 100 }),
        prioritiesService.getPriorities({ status: 'ACTIVE', perPage: 100 }),
      ])
      setCategories(catRes.data)
      setPriorities(priRes.data)
    }
    void loadCatalogs()
  }, [])

  const fetchTickets = useCallback(async () => {
    try {
      const response = await loadTickets({
        page: viewMode === 'kanban' ? 1 : page,
        perPage: viewMode === 'kanban' ? 100 : perPage,
        search: search || undefined,
        preset: viewMode === 'kanban' ? undefined : presetFilter || undefined,
        status: viewMode === 'kanban' ? undefined : presetFilter ? undefined : statusFilter || undefined,
        priorityId: priorityFilter || undefined,
        categoryId: categoryFilter || undefined,
        slaStatus: slaFilter || undefined,
        mine: tab === 'mine' ? true : undefined,
        unassigned: tab === 'unassigned' ? true : undefined,
      })
      if (response.meta) setMeta(response.meta)
    } catch {
      // error in hook
    }
  }, [
    loadTickets,
    page,
    perPage,
    search,
    statusFilter,
    presetFilter,
    priorityFilter,
    categoryFilter,
    slaFilter,
    tab,
    viewMode,
  ])

  useEffect(() => {
    void fetchTickets()
  }, [fetchTickets])

  const columns: Column<Ticket>[] = [
    {
      key: 'folio',
      header: 'Folio',
      render: (row) => (
        <Link to={`/tickets/${row.id}`} className="font-medium text-brand-teal hover:underline">
          {row.folio}
        </Link>
      ),
    },
    { key: 'title', header: 'Título', sortable: true },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'priorityName',
      header: 'Prioridad',
      render: (row) => <span style={{ color: row.priorityColor }}>{row.priorityName}</span>,
    },
    { key: 'categoryName', header: 'Categoría' },
    {
      key: 'assigneeName',
      header: 'Agente',
      render: (row) => row.assigneeName ?? '—',
    },
    {
      key: 'sla',
      header: 'SLA',
      render: (row) => {
        const sla = calculateSlaStatus(row.createdAt, row.slaDueAt, row.resolutionHours)
        return <SlaSemaphore sla={sla} compact />
      },
    },
  ]

  const showUnassignedTab =
    hasPermission(PERMISSIONS.TICKET_ASSIGN) ||
    user?.role === 'SUPERVISOR' ||
    user?.role === 'ADMIN'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-brand-slate/30 pb-2">
        {(user?.role === 'AGENT' || showUnassignedTab) && (
          <div className="flex flex-wrap gap-2">
            {user?.role === 'AGENT' && (
              <button
                type="button"
                onClick={() => {
                  setTab('mine')
                  setPage(1)
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === 'mine'
                    ? 'bg-brand-teal text-white'
                    : 'text-brand-navy hover:bg-brand-cream/50'
                }`}
              >
                Mis asignados
              </button>
            )}
            {showUnassignedTab && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setTab('all')
                    setPage(1)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === 'all'
                      ? 'bg-brand-teal text-white'
                      : 'text-brand-navy hover:bg-brand-cream/50'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('unassigned')
                    setPage(1)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === 'unassigned'
                      ? 'bg-brand-teal text-white'
                      : 'text-brand-navy hover:bg-brand-cream/50'
                  }`}
                >
                  Sin asignar
                </button>
              </>
            )}
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded border border-border bg-surface p-1"
            role="group"
            aria-label="Cambiar vista de tickets"
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:bg-page hover:text-text'
              }`}
              aria-pressed={viewMode === 'table'}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              Tabla
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('kanban')
                setStatusFilter('')
                setPresetFilter('')
                setPage(1)
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:bg-page hover:text-text'
              }`}
              aria-pressed={viewMode === 'kanban'}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 4h3v16H6zM11 4h3v10h-3zM16 4h3v13h-3z"
                />
              </svg>
              Kanban
            </button>
          </div>
          {hasPermission(PERMISSIONS.TICKET_CREATE) && (
            <Link
              to="/tickets/create"
              className="inline-flex items-center justify-center gap-2 rounded bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <AppIcon name="plus" className="h-4 w-4" />
              Nuevo ticket
            </Link>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <input
            type="search"
            placeholder="Buscar folio o título..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
          />
        </div>
        {viewMode === 'table' && (
          <SelectInput
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TicketStatus | '')
              setPresetFilter('')
              setPage(1)
            }}
            className="w-44"
          >
            <option value="">Todos los estados</option>
            <option value="OPEN">Abierto</option>
            <option value="ASSIGNED">Asignado</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="WAITING_USER">Esperando usuario</option>
            <option value="ESCALATED">Escalado</option>
            <option value="RESOLVED">Resuelto</option>
            <option value="CLOSED">Cerrado</option>
            <option value="CANCELLED">Cancelado</option>
          </SelectInput>
        )}
        <SelectInput
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          className="w-44"
        >
          <option value="">Todas las prioridades</option>
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectInput>
        <div className="w-44">
          <SearchableSelect
            id="tickets-category-filter"
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value)
              setPage(1)
            }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Todas las categorías"
            searchPlaceholder="Buscar categoría..."
            emptyMessage="No hay categorías"
            noResultsMessage="Ninguna categoría coincide con la búsqueda"
            allowEmpty
            emptyLabel="Todas las categorías"
          />
        </div>
        <SelectInput
          aria-label="SLA"
          value={slaFilter}
          onChange={(e) => {
            setSlaFilter(e.target.value as SlaFilterStatus | '')
            setPage(1)
          }}
          className="w-40"
        >
          <option value="">SLA: todos</option>
          <option value="overdue">Vencidos</option>
          <option value="warning">Próximos a vencer</option>
          <option value="on_time">En tiempo</option>
        </SelectInput>
      </div>

      {error && tickets.length === 0 && !loading ? (
        <ErrorState message={error} onRetry={() => void fetchTickets()} />
      ) : viewMode === 'kanban' ? (
        <TicketsKanbanBoard tickets={tickets} loading={loading && tickets.length === 0} />
      ) : (
        <DataTable
          columns={columns}
          data={tickets}
          loading={loading && tickets.length === 0}
          pagination={{ ...meta, page, perPage }}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPerPage(value)
            setPage(1)
          }}
          rowKey={(row) => row.id}
          emptyMessage={
            search || statusFilter || presetFilter || priorityFilter || categoryFilter || slaFilter
              ? 'No hay tickets que coincidan con los filtros.'
              : 'No hay tickets para mostrar.'
          }
        />
      )}
    </div>
  )
}
