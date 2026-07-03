import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmModal } from '@/components/common/Modal'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { ROLES } from '@/constants/roles'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as usersService from '@/services/users.service'
import type { User, UserRole, UserStatus } from '@/types/user.types'

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  LOCKED: 'Bloqueado',
}

export function UsersListPage() {
  const { hasPermission } = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [statusModal, setStatusModal] = useState<{ user: User; status: UserStatus } | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await usersService.getUsers({
        page,
        perPage: 10,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      })
      setUsers(response.data)
      if (response.meta) {
        setMeta(response.meta)
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter, statusFilter, search])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const handleStatusChange = async () => {
    if (!statusModal) return
    setStatusLoading(true)
    try {
      await usersService.updateUserStatus(statusModal.user.id, statusModal.status)
      setStatusModal(null)
      await loadUsers()
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al actualizar estado')
    } finally {
      setStatusLoading(false)
    }
  }

  const columns: Column<User>[] = [
    { key: 'fullName', header: 'Nombre', sortable: true },
    { key: 'email', header: 'Correo' },
    {
      key: 'role',
      header: 'Rol',
      render: (row) => ROLES[row.role],
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
          <Link
            to={`/users/${row.id}/edit`}
            className="text-sm text-brand-teal hover:underline"
          >
            Editar
          </Link>
          {hasPermission(PERMISSIONS.USER_MANAGE) && (
            <>
              {row.status !== 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => setStatusModal({ user: row, status: 'ACTIVE' })}
                  className="text-sm text-green-700 hover:underline"
                >
                  Activar
                </button>
              )}
              {row.status !== 'INACTIVE' && (
                <button
                  type="button"
                  onClick={() => setStatusModal({ user: row, status: 'INACTIVE' })}
                  className="text-sm text-amber-700 hover:underline"
                >
                  Desactivar
                </button>
              )}
              {row.status !== 'LOCKED' && (
                <button
                  type="button"
                  onClick={() => setStatusModal({ user: row, status: 'LOCKED' })}
                  className="text-sm text-brand-scarlet hover:underline"
                >
                  Bloquear
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-brand-navy">Usuarios</h1>
        <Link
          to="/users/create"
          className="inline-flex justify-center rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90"
        >
          Nuevo usuario
        </Link>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as UserRole | '')
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Todos los roles</option>
          {(Object.keys(ROLES) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLES[role]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as UserStatus | '')
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
          <option value="LOCKED">Bloqueado</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void loadUsers()} />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          emptyMessage="No se encontraron usuarios"
        />
      )}

      <ConfirmModal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        onConfirm={() => void handleStatusChange()}
        title="Confirmar cambio de estado"
        message={
          statusModal
            ? `¿Deseas cambiar el estado de ${statusModal.user.fullName} a ${STATUS_LABELS[statusModal.status]}?`
            : ''
        }
        variant={statusModal?.status === 'LOCKED' ? 'danger' : 'primary'}
        loading={statusLoading}
      />
    </div>
  )
}
