import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmModal } from '@/components/common/Modal'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { TableActionButton } from '@/components/common/TableActionButton'
import { ROLES } from '@/constants/roles'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import * as usersService from '@/services/users.service'
import type { User, UserRole, UserStatus } from '@/types/user.types'

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  LOCKED: 'Bloqueado',
}

export function UsersListPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { hasPermission } = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [statusModal, setStatusModal] = useState<{ user: User; status: UserStatus } | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)

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
    setProcessingUserId(statusModal.user.id)
    setError('')
    setSuccess('')
    try {
      await usersService.updateUserStatus(statusModal.user.id, statusModal.status)
      setSuccess(
        `Estado de ${statusModal.user.fullName} actualizado a ${STATUS_LABELS[statusModal.status]}.`,
      )
      setStatusModal(null)
      await loadUsers()
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al actualizar estado')
    } finally {
      setStatusLoading(false)
      setProcessingUserId(null)
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
      render: (row) => {
        const isSelf = currentUser?.id === row.id
        const isBusy = statusLoading && processingUserId === row.id
        const canManage = hasPermission(PERMISSIONS.USER_MANAGE)

        return (
          <div className="flex flex-wrap gap-2">
            <TableActionButton
              label={`Editar usuario ${row.fullName}`}
              icon="edit"
              onClick={() => navigate(`/users/${row.id}/edit`)}
              disabled={isBusy}
            />
            {canManage && (
              <>
                {row.status !== 'ACTIVE' && (
                  <TableActionButton
                    label={`Activar usuario ${row.fullName}`}
                    variant="success"
                    icon="check"
                    onClick={() => setStatusModal({ user: row, status: 'ACTIVE' })}
                    disabled={isBusy}
                  />
                )}
                {row.status === 'ACTIVE' && !isSelf && (
                  <TableActionButton
                    label={`Desactivar usuario ${row.fullName}`}
                    variant="warning"
                    icon="pause"
                    onClick={() => setStatusModal({ user: row, status: 'INACTIVE' })}
                    disabled={isBusy}
                  />
                )}
                {row.status !== 'LOCKED' && !isSelf && (
                  <TableActionButton
                    label={`Bloquear usuario ${row.fullName}`}
                    variant="danger"
                    icon="shield"
                    onClick={() => setStatusModal({ user: row, status: 'LOCKED' })}
                    disabled={isBusy}
                  />
                )}
              </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Administración
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text md:text-3xl">
            Usuarios
          </h1>
          <p className="mt-1 text-sm text-muted">
            Gestiona identidades, roles y estado de acceso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/users/create')}
          className="inline-flex justify-center rounded bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Nuevo usuario
        </button>
      </div>

      <div className="ui-card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {success && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorState message={error} onRetry={() => void loadUsers()} />
        </div>
      )}

      {!(error && users.length === 0 && !loading) && (
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
        onClose={() => {
          if (!statusLoading) setStatusModal(null)
        }}
        onConfirm={() => void handleStatusChange()}
        title="Confirmar cambio de estado"
        message={
          statusModal
            ? `¿Deseas cambiar el estado de ${statusModal.user.fullName} a ${STATUS_LABELS[statusModal.status]}?`
            : ''
        }
        variant={
          statusModal?.status === 'LOCKED' || statusModal?.status === 'INACTIVE'
            ? 'danger'
            : 'primary'
        }
        loading={statusLoading}
      />
    </div>
  )
}
