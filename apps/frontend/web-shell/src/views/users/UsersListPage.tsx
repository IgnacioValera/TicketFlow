import { useAppNavigate } from '@/hooks/useAppNavigate'
import { useCallback, useEffect, useState } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { ConfirmModal, Modal } from '@/components/common/Modal'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { ConfirmToast, FeedbackAlert } from '@/components/common/FeedbackAlert'
import { TableActionButton } from '@/components/common/TableActionButton'
import { PrimaryButton, SecondaryButton, SelectInput } from '@/components/common/UiControls'
import { ROLES } from '@/constants/roles'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import * as usersService from '@/services/users.service'
import type { User, UserRole, UserStatus } from '@/types/user.types'
import { createSubmitLock } from '@/utils/submit-lock'
import { canResetUserPassword } from '@/utils/user-admin'
import { resolveContentStatus } from '@/utils/session-gate'
import { consumeNavFlash } from '@/utils/nav-flash'

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  LOCKED: 'Bloqueado',
}

export function UsersListPage() {
  const navigate = useAppNavigate()
  const { user: currentUser } = useAuth()
  const { hasPermission } = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [statusModal, setStatusModal] = useState<{ user: User; status: UserStatus } | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [resetConfirmUser, setResetConfirmUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [discardUncopied, setDiscardUncopied] = useState(false)
  const [statusLock] = useState(() => createSubmitLock())
  const [resetLock] = useState(() => createSubmitLock())

  useEffect(() => {
    return () => {
      setTemporaryPassword('')
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await usersService.getUsers({
        page,
        perPage,
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
  }, [page, perPage, roleFilter, statusFilter, search])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    const state = consumeNavFlash<{ createdName?: string; updatedName?: string }>('users-toast')
    if (state?.createdName) {
      setToast({
        title: 'Usuario creado',
        message: `${state.createdName} se agregó al directorio.`,
      })
      void loadUsers()
    } else if (state?.updatedName) {
      setToast({
        title: 'Usuario actualizado',
        message: `${state.updatedName} se actualizó correctamente.`,
      })
      void loadUsers()
    }
  }, [loadUsers])
  const handleStatusChange = async () => {
    if (!statusModal || statusLoading || statusLock.pending) return
    await statusLock.run(async () => {
      setStatusLoading(true)
      setProcessingUserId(statusModal.user.id)
      setError('')
      try {
        const updated = await usersService.updateUserStatus(statusModal.user.id, statusModal.status)
        setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        setToast({
          title: 'Estado actualizado',
          message: `Estado de ${statusModal.user.fullName} actualizado a ${STATUS_LABELS[statusModal.status]}.`,
        })
        setStatusModal(null)
        await loadUsers()
      } catch (err: unknown) {
        setError((err as { message?: string }).message || 'Error al actualizar estado')
      } finally {
        setStatusLoading(false)
        setProcessingUserId(null)
      }
    })
  }

  const finishResetModal = () => {
    setDiscardUncopied(false)
    setResetUser(null)
    setResetConfirmUser(null)
    setTemporaryPassword('')
    setPasswordVisible(false)
    setPasswordCopied(false)
    setResetError('')
  }

  const closeResetModal = () => {
    if (resetLoading || discardUncopied) return
    if (temporaryPassword && !passwordCopied) {
      setDiscardUncopied(true)
      return
    }
    finishResetModal()
  }

  const handleResetPassword = async () => {
    const target = resetConfirmUser ?? resetUser
    if (!target || resetLoading || resetLock.pending) return
    await resetLock.run(async () => {
      setResetLoading(true)
      setResetError('')
      try {
        const response = await usersService.resetUserPassword(target.id)
        setResetUser(target)
        setResetConfirmUser(null)
        setTemporaryPassword(response.temporaryPassword)
        setPasswordVisible(false)
        setPasswordCopied(false)
      } catch (err: unknown) {
        setResetError((err as { message?: string }).message || 'No se pudo restablecer la contraseña')
      } finally {
        setResetLoading(false)
      }
    })
  }

  const copyTemporaryPassword = async () => {
    if (!temporaryPassword) return
    await navigator.clipboard.writeText(temporaryPassword)
    setPasswordCopied(true)
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
      key: 'clientName',
      header: 'Cliente',
      render: (row) => row.clientName || (row.role === 'REQUESTER' || row.role === 'CLIENT' ? 'Sin cliente asignado' : '—'),
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
              <TableActionButton
                label={
                  canResetUserPassword(canManage, row.status)
                    ? `Restablecer contraseña de ${row.fullName}`
                    : 'No se puede restablecer la contraseña de un usuario inactivo'
                }
                icon="key"
                onClick={() => {
                  if (!canResetUserPassword(canManage, row.status)) return
                  setResetConfirmUser(row)
                  setResetUser(null)
                  setTemporaryPassword('')
                  setPasswordVisible(false)
                  setPasswordCopied(false)
                  setResetError('')
                }}
                disabled={isBusy || resetLoading || !canResetUserPassword(canManage, row.status)}
              />
            )}
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
      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <input
            type="search"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
          />
        </div>
        <SelectInput
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as UserRole | '')
            setPage(1)
          }}
          className="w-44"
        >
          <option value="">Todos los roles</option>
          {(Object.keys(ROLES) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLES[role]}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as UserStatus | '')
            setPage(1)
          }}
          className="w-40"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
          <option value="LOCKED">Bloqueado</option>
        </SelectInput>
        <div className="ml-auto">
          <PrimaryButton type="button" onClick={() => navigate('/users/create')}>
            <AppIcon name="plus" className="h-4 w-4" />
            Nuevo usuario
          </PrimaryButton>
        </div>
      </div>

      {error && users.length > 0 && (
        <div className="mb-4">
          <FeedbackAlert variant="danger" title="No se pudo completar la acción" message={error} />
        </div>
      )}

      {error && users.length === 0 && !loading ? (
        <ErrorState
          title="No se pudieron cargar los usuarios."
          message={error}
          onRetry={() => void loadUsers()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          loading={resolveContentStatus({ loading, error, itemCount: users.length }) === 'loading'}
          loadingLabel="Cargando usuarios…"
          pagination={{ ...meta, page, perPage }}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPerPage(value)
            setPage(1)
          }}
          rowKey={(row) => row.id}
          emptyMessage={
            search || roleFilter || statusFilter
              ? 'No hay usuarios que coincidan con los filtros.'
              : 'No hay usuarios registrados.'
          }
          emptyDescription={
            search || roleFilter || statusFilter
              ? 'Prueba con otro criterio o limpia los filtros.'
              : 'Crea el primer usuario para comenzar.'
          }
          emptyAction={
            <div className="flex flex-wrap justify-center gap-2">
              {(search || roleFilter || statusFilter) && (
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setRoleFilter('')
                    setStatusFilter('')
                    setPage(1)
                  }}
                >
                  Limpiar filtros
                </SecondaryButton>
              )}
              {hasPermission(PERMISSIONS.USER_MANAGE) && (
                <PrimaryButton type="button" onClick={() => navigate('/users/create')}>
                  <AppIcon name="plus" className="h-4 w-4" />
                  Crear usuario
                </PrimaryButton>
              )}
            </div>
          }
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
        loadingLabel="Actualizando…"
      />

      <ConfirmModal
        open={!!resetConfirmUser && !temporaryPassword}
        onClose={() => {
          if (!resetLoading) {
            setResetConfirmUser(null)
            setResetError('')
          }
        }}
        onConfirm={() => void handleResetPassword()}
        title="Restablecer contraseña"
        message={
          resetConfirmUser
            ? `${resetError ? `${resetError} ` : ''}¿Deseas restablecer la contraseña de ${resetConfirmUser.fullName}? La contraseña actual dejará de funcionar y se mostrará una contraseña temporal una sola vez.`
            : ''
        }
        confirmLabel="Restablecer"
        variant="danger"
        loading={resetLoading}
        loadingLabel="Restableciendo…"
      />

      <Modal
        open={!!temporaryPassword}
        onClose={closeResetModal}
        title="Contraseña temporal generada"
        size="md"
      >
        {temporaryPassword && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-text">Contraseña temporal generada</p>
              <div className="mt-3 flex items-center gap-2 rounded border border-border bg-page px-3 py-2.5">
                <code className="flex-1 break-all text-sm font-semibold tracking-wide">
                  {passwordVisible ? temporaryPassword : '••••••••••••'}
                </code>
                <button
                  type="button"
                  onClick={() => setPasswordVisible((value) => !value)}
                  className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-white hover:text-text"
                  aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <AppIcon name={passwordVisible ? 'eye-off' : 'eye'} className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-muted">
                Compártela de forma segura con el usuario. Este valor no volverá a mostrarse.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <SecondaryButton onClick={() => void copyTemporaryPassword()}>
                {passwordCopied ? 'Contraseña copiada' : 'Copiar contraseña'}
              </SecondaryButton>
              <PrimaryButton onClick={closeResetModal}>Finalizar</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmModal
        open={discardUncopied}
        onClose={() => setDiscardUncopied(false)}
        title="Contraseña sin copiar"
        message="La contraseña temporal no se copió y no volverá a mostrarse. ¿Deseas cerrar de todos modos?"
        confirmLabel="Cerrar de todos modos"
        cancelLabel="Seguir aquí"
        variant="danger"
        onConfirm={finishResetModal}
      />
    </div>
  )
}
