import type { ReactNode } from 'react'
import { EmptyState } from '@/components/common/EmptyState'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  className?: string
}

interface PaginationState {
  page: number
  perPage: number
  total: number
  totalPages: number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pagination?: PaginationState
  onPageChange?: (page: number) => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: string) => void
  emptyMessage?: string
  rowKey: (row: T) => string
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  sortKey,
  sortDirection = 'asc',
  onSort,
  emptyMessage = 'No hay registros para mostrar',
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-brand-slate/40 bg-white">
        <div className="animate-pulse space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-brand-slate/20" />
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return <EmptyState title={emptyMessage} />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-slate/40 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-slate/30">
          <thead className="bg-brand-cream/40">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-navy ${col.className ?? ''}`}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-brand-teal"
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
          <tbody className="divide-y divide-brand-slate/20">
            {data.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-brand-cream/20">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm text-slate-700 ${col.className ?? ''}`}>
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-brand-slate/30 px-4 py-3">
          <p className="text-sm text-slate-600">
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
              className="rounded-lg border border-brand-slate px-3 py-1 text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
              className="rounded-lg border border-brand-slate px-3 py-1 text-sm disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
