import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { SelectInput } from '@/components/common/UiControls'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  className?: string
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
  totalPages: number
}

const DEFAULT_PER_PAGE_OPTIONS = [5, 10, 20, 50]

interface TablePaginationProps {
  pagination?: PaginationState
  onPageChange?: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
}

export function TablePagination({
  pagination,
  onPageChange,
  onPerPageChange,
  perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
}: TablePaginationProps) {
  if (!pagination || (pagination.totalPages <= 1 && !onPerPageChange)) return null
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPerPageChange && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Mostrar
            <SelectInput
              value={pagination.perPage}
              onChange={(event) => onPerPageChange(Number(event.target.value))}
              aria-label="Registros por página"
              className="w-20"
            >
              {perPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
            por página
          </label>
        )}
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange?.(pagination.page - 1)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange?.(pagination.page + 1)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pagination?: PaginationState
  onPageChange?: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: string) => void
  loadingLabel?: string
  emptyMessage?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onPerPageChange,
  perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
  sortKey,
  sortDirection = 'asc',
  onSort,
  loadingLabel = 'Cargando información…',
  emptyMessage = 'No hay información disponible',
  emptyDescription,
  emptyAction,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingSkeleton variant="table" rows={6} label={loadingLabel} />
  }

  if (data.length === 0) {
    return <EmptyState title={emptyMessage} description={emptyDescription} action={emptyAction} />
  }

  const handleRowActivate = (row: T) => {
    onRowClick?.(row)
  }

  const handleRowKey = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowActivate(row)
    }
  }

  const stopIfInteractive = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target as HTMLElement
    return Boolean(target.closest('button, a, input, select, textarea, label'))
  }

  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${col.className ?? ''}`}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex cursor-pointer items-center gap-1 hover:text-brand-teal"
                    >
                      {col.header}
                      {sortKey === col.key && (
                        <span aria-hidden>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                className={`transition-colors hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={(event) => {
                  if (!onRowClick || stopIfInteractive(event)) return
                  handleRowActivate(row)
                }}
                onKeyDown={(event) => handleRowKey(event, row)}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 text-sm text-slate-700 ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        pagination={pagination}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        perPageOptions={perPageOptions}
      />
    </div>
  )
}
