import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import type { Ticket, TicketStatus, SlaFilterStatus } from '@/types/ticket.types'
import { calculateSlaStatus } from '@/utils/sla.utils'

type ListTab = 'all' | 'mine' | 'unassigned'
type ViewMode = 'table' | 'kanban'

export function TicketsListPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const { tickets, loading, error, loadTickets } = useTickets()

  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('')
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
        perPage: viewMode === 'kanban' ? 100 : 10,
        search: search || undefined,
        status: viewMode === 'kanban' ? undefined : statusFilter || undefined,
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
    search,
    statusFilter,
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c8191]">Operación</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-navy md:text-3xl">
            Tickets
          </h1>
          <p className="mt-1 text-sm text-[#766c7c]">
            Consulta, filtra y da seguimiento a cada solicitud.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-[#e2dce5] bg-white p-1 shadow-[0_4px_14px_rgba(61,45,69,.05)]"
            role="group"
            aria-label="Cambiar vista de tickets"
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'text-[#766c7c] hover:bg-[#f6f3f8] hover:text-brand-navy'
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
                setPage(1)
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'text-[#766c7c] hover:bg-[#f6f3f8] hover:text-brand-navy'
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
              className="inline-flex justify-center rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(111,79,216,.2)] hover:bg-[#6040c8]"
            >
              Nuevo ticket
            </Link>
          )}
        </div>
      </div>

      {(user?.role === 'AGENT' || showUnassignedTab) && (
        <div className="mb-4 flex flex-wrap gap-2 border-b border-brand-slate/30 pb-2">
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

      <div
        className={`mb-5 grid gap-3 rounded-2xl border border-[#e2dce5] bg-white p-4 shadow-[0_8px_25px_rgba(61,45,69,.04)] sm:grid-cols-2 ${
          viewMode === 'kanban' ? 'xl:grid-cols-4' : 'xl:grid-cols-5'
        }`}
      >
        <input
          type="search"
          placeholder="Buscar folio o título..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="min-w-0 rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
        />
        {viewMode === 'table' && (
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TicketStatus | '')
              setPage(1)
            }}
            className="min-w-0 rounded-lg border border-brand-slate px-3 py-2 text-sm"
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
          </select>
        )}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          className="min-w-0 rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Todas las prioridades</option>
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          className="min-w-0 rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={slaFilter}
          onChange={(e) => {
            setSlaFilter(e.target.value as SlaFilterStatus | '')
            setPage(1)
          }}
          className="min-w-0 rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">SLA: todos</option>
          <option value="overdue">Vencidos</option>
          <option value="warning">Próximos a vencer</option>
          <option value="on_time">En tiempo</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void fetchTickets()} />
      ) : viewMode === 'kanban' ? (
        <TicketsKanbanBoard tickets={tickets} loading={loading} />
      ) : (
        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          emptyMessage="No se encontraron tickets"
        />
      )}
    </div>
  )
}
