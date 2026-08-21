import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmModal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { ConfirmToast, FeedbackAlert } from '@/components/common/FeedbackAlert'
import { PrimaryButton, SecondaryButton, SelectInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import * as accessService from '@/services/access.service'
import type {
  AccessModuleSummary,
  AccessRoleSummary,
  PermissionAuditItem,
  RolePermissionModule,
} from '@/types/access.types'
import { AUDIT_ACTION_LABELS } from '@/types/access.types'
import { getErrorMessages } from '@/utils/errors'
import {
  assignedPermissionIds,
  hasUnsavedPermissionChanges,
  isModuleFullySelected,
  setModulePermissions,
  togglePermission,
} from '@/utils/roles-permissions'
import { createSubmitLock } from '@/utils/submit-lock'
import { resolveContentStatus } from '@/utils/session-gate'

type Tab = 'privileges' | 'modules' | 'history'

export function RolesPermissionsPage() {
  const { user, refreshProfile } = useAuth()
  const { hasPermission } = usePermissions()
  const canManagePermissions = hasPermission(PERMISSIONS.ROLE_PERMISSION_MANAGE)
  const canManageModules = hasPermission(PERMISSIONS.MODULE_MANAGE)

  const [tab, setTab] = useState<Tab>('privileges')
  const [roles, setRoles] = useState<AccessRoleSummary[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [modules, setModules] = useState<RolePermissionModule[]>([])
  const [catalogModules, setCatalogModules] = useState<AccessModuleSummary[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [version, setVersion] = useState(1)
  const [audits, setAudits] = useState<PermissionAuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)
  const [formError, setFormError] = useState('')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [pendingRoleId, setPendingRoleId] = useState('')
  const [moduleTarget, setModuleTarget] = useState<AccessModuleSummary | null>(null)
  const [saveLock] = useState(() => createSubmitLock())

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null
  const draftIds = useMemo(() => assignedPermissionIds(modules), [modules])
  const dirty = hasUnsavedPermissionChanges(savedIds, draftIds)
  const status = resolveContentStatus({ loading, error, itemCount: roles.length })

  const loadRoles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await accessService.listRoles()
      setRoles(items)
      setSelectedRoleId((current) => current || items[0]?.id || '')
    } catch (err) {
      setError(getErrorMessages(err, 'No se pudieron cargar los roles.')[0])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRole = useCallback(async (roleId: string) => {
    if (!roleId) return
    setError('')
    try {
      const payload = await accessService.getRolePermissions(roleId)
      setModules(payload.modules)
      setSavedIds(assignedPermissionIds(payload.modules))
      setVersion(payload.role.permissionsVersion)
      setFormError('')
    } catch (err) {
      setError(getErrorMessages(err, 'No se pudieron cargar los privilegios del rol.')[0])
    }
  }, [])

  const loadModules = useCallback(async () => {
    try {
      setCatalogModules(await accessService.listModules())
    } catch (err) {
      setFormError(getErrorMessages(err, 'No se pudieron cargar los módulos.')[0])
    }
  }, [])

  const loadAudit = useCallback(async (roleId: string) => {
    if (!roleId) return
    try {
      const [roleAudit, moduleAudit] = await Promise.all([
        accessService.getRoleAudit(roleId),
        accessService.getModuleAudit().catch(() => []),
      ])
      setAudits(
        [...roleAudit, ...moduleAudit].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      )
    } catch (err) {
      setFormError(getErrorMessages(err, 'No se pudo cargar el historial.')[0])
    }
  }, [])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  useEffect(() => {
    if (!selectedRoleId) return
    void loadRole(selectedRoleId)
    void loadAudit(selectedRoleId)
  }, [selectedRoleId, loadRole, loadAudit])

  useEffect(() => {
    if (tab === 'modules') void loadModules()
  }, [tab, loadModules])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleRoleChange = (nextId: string) => {
    if (nextId === selectedRoleId) return
    if (dirty) {
      setPendingRoleId(nextId)
      setDiscardOpen(true)
      return
    }
    setSelectedRoleId(nextId)
  }

  const handleSave = () =>
    saveLock.run(async () => {
      if (!selectedRoleId || !canManagePermissions) return
      setSaving(true)
      setFormError('')
      try {
        const payload = await accessService.updateRolePermissions(selectedRoleId, {
          permissionIds: draftIds,
          expectedVersion: version,
        })
        setModules(payload.modules)
        setSavedIds(assignedPermissionIds(payload.modules))
        setVersion(payload.role.permissionsVersion)
        setRoles((current) =>
          current.map((role) =>
            role.id === selectedRoleId
              ? { ...role, permissionCount: draftIds.length, permissionsVersion: payload.role.permissionsVersion }
              : role,
          ),
        )
        setToast({ title: 'Privilegios guardados', message: `Se actualizó el rol ${payload.role.name}.` })
        await loadAudit(selectedRoleId)
        if (user?.role === payload.role.code) {
          await refreshProfile()
        }
      } catch (err) {
        const statusCode = (err as { status?: number }).status
        if (statusCode === 409) {
          setFormError(getErrorMessages(err, 'La configuración cambió. Recarga los privilegios.')[0])
          await loadRole(selectedRoleId)
        } else if (statusCode === 403) {
          setFormError('No tienes permiso para modificar privilegios.')
          await refreshProfile()
        } else {
          setFormError(getErrorMessages(err, 'No se pudieron guardar los privilegios.')[0])
        }
      } finally {
        setSaving(false)
      }
    })

  const handleCancel = () => {
    if (!dirty) return
    setDiscardOpen(true)
  }

  const confirmDiscard = () => {
    setDiscardOpen(false)
    if (pendingRoleId) {
      setSelectedRoleId(pendingRoleId)
      setPendingRoleId('')
      return
    }
    void loadRole(selectedRoleId)
  }

  const handleModuleStatus = async (item: AccessModuleSummary) => {
    if (!canManageModules || item.isSystem) return
    setModuleTarget(null)
    try {
      const updated = await accessService.updateModuleStatus(item.id, !item.isActive)
      setCatalogModules((current) => current.map((module) => (module.id === updated.id ? updated : module)))
      setToast({
        title: updated.isActive ? 'Módulo activado' : 'Módulo desactivado',
        message: `${updated.name} ${updated.isActive ? 'vuelve a estar disponible' : 'dejó de autorizar acciones'}.`,
      })
      if (selectedRoleId) await loadRole(selectedRoleId)
      await refreshProfile()
    } catch (err) {
      setFormError(getErrorMessages(err, 'No se pudo actualizar el módulo.')[0])
    }
  }

  return (
    <section className="space-y-5">
      <ConfirmToast open={!!toast} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xl font-semibold text-brand-navy">Administra qué puede hacer cada rol</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Define qué puede hacer cada rol. Los cambios se aplican a las sesiones activas sin cerrar sesión.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['privileges', 'modules', 'history'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded px-3 py-2 text-sm font-medium ${
                tab === item ? 'bg-primary text-white' : 'border border-slate-300 bg-white text-brand-navy'
              }`}
            >
              {item === 'privileges' ? 'Privilegios' : item === 'modules' ? 'Módulos' : 'Historial'}
            </button>
          ))}
        </div>
      </header>

      {formError && <FeedbackAlert variant="danger" title="No se pudo completar la acción" message={formError} />}

      {status === 'loading' && (
        <div className="rounded border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">Cargando roles y privilegios…</div>
      )}
      {status === 'error' && <ErrorState message={error} onRetry={() => void loadRoles()} />}
      {status === 'empty' && <EmptyState title="No hay roles disponibles" description="Ejecuta el seed para crear los roles iniciales." />}

      {status === 'ready' && tab === 'privileges' && (
        <div className="space-y-4">
          <div className="grid gap-4 rounded border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-brand-navy">Rol</span>
              <SelectInput id="access-role" aria-label="Rol" value={selectedRoleId} onChange={(event) => handleRoleChange(event.target.value)}>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </SelectInput>
            </label>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Usuarios</p>
              <p className="text-lg font-semibold text-brand-navy">{selectedRole?.userCount ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Permisos activos</p>
              <p className="text-lg font-semibold text-brand-navy">{draftIds.length}</p>
            </div>
            {selectedRole?.description && (
              <p className="text-sm text-slate-600 md:col-span-2 lg:col-span-4">{selectedRole.description}</p>
            )}
          </div>

          {dirty && (
            <p className="text-sm font-medium text-amber-700" role="status">
              Hay cambios sin guardar.
            </p>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {modules.map((module) => {
              const disabled = !module.isActive
              return (
                <article key={module.id} className="rounded border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-brand-navy">{module.name}</h2>
                      <p className="text-xs text-slate-500">{module.description}</p>
                      {disabled && <p className="mt-1 text-xs text-amber-700">Este módulo está desactivado y no autoriza acciones.</p>}
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-brand-navy">
                      <input
                        type="checkbox"
                        checked={isModuleFullySelected(module)}
                        disabled={disabled || !canManagePermissions}
                        onChange={(event) => setModules((current) => setModulePermissions(current, module.id, event.target.checked))}
                      />
                      Seleccionar todos
                    </label>
                  </div>
                  <ul className="space-y-2">
                    {module.permissions.map((permission) => (
                      <li key={permission.id}>
                        <label className="flex items-start gap-2 text-sm text-brand-navy" title={permission.description}>
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={permission.assigned}
                            disabled={disabled || !canManagePermissions}
                            aria-label={permission.name}
                            onChange={() => setModules((current) => togglePermission(current, permission.id))}
                          />
                          <span>
                            <span className="font-medium">{permission.name}</span>
                            <span className="block text-xs text-slate-500">{permission.description}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </article>
              )
            })}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton type="button" onClick={handleCancel} disabled={!dirty || saving}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="button" onClick={() => void handleSave()} loading={saving} disabled={!dirty || !canManagePermissions}>
              Guardar
            </PrimaryButton>
          </div>
        </div>
      )}

      {status === 'ready' && tab === 'modules' && (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-brand-navy">
              <tr>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {catalogModules.map((module) => (
                <tr key={module.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{module.name}</p>
                    <p className="text-xs text-slate-500">{module.description}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Si se desactiva, sus permisos dejan de autorizar menús, rutas y endpoints, pero no se eliminan.
                    </p>
                  </td>
                  <td className="px-4 py-3">{module.isActive ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-4 py-3">{module.isSystem ? 'Sistema' : 'Configurable'}</td>
                  <td className="px-4 py-3">
                    {module.isSystem ? (
                      <span className="text-xs text-slate-500">No se puede desactivar</span>
                    ) : (
                      <SecondaryButton
                        type="button"
                        disabled={!canManageModules}
                        onClick={() => setModuleTarget(module)}
                      >
                        {module.isActive ? 'Desactivar' : 'Activar'}
                      </SecondaryButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'ready' && tab === 'history' && (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          {audits.length === 0 ? (
            <EmptyState title="Sin cambios registrados" description="Cuando se modifiquen privilegios o módulos aparecerá el historial." />
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-brand-navy">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol o módulo</th>
                  <th className="px-4 py-3">Agregados</th>
                  <th className="px-4 py-3">Eliminados</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.actor?.fullName ?? 'Sistema'}</p>
                      <p className="text-xs text-slate-500">{AUDIT_ACTION_LABELS[item.action] ?? item.action}</p>
                    </td>
                    <td className="px-4 py-3">{item.role?.name ?? item.module?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.addedPermissions.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.removedPermissions.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-xs">{new Date(item.createdAt).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmModal
        open={discardOpen}
        onClose={() => {
          setDiscardOpen(false)
          setPendingRoleId('')
        }}
        onConfirm={confirmDiscard}
        title="Descartar cambios"
        message="Hay privilegios sin guardar. Si continúas se perderán los cambios."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        variant="danger"
      />
      <ConfirmModal
        open={!!moduleTarget}
        onClose={() => setModuleTarget(null)}
        onConfirm={() => {
          if (moduleTarget) void handleModuleStatus(moduleTarget)
        }}
        title={moduleTarget?.isActive ? 'Desactivar módulo' : 'Activar módulo'}
        message={
          moduleTarget?.isActive
            ? `Al desactivar ${moduleTarget.name}, sus permisos dejarán de autorizar acciones hasta que se reactive.`
            : `Al activar ${moduleTarget?.name ?? 'el módulo'}, los privilegios asignados volverán a aplicarse.`
        }
        confirmLabel={moduleTarget?.isActive ? 'Desactivar' : 'Activar'}
      />
    </section>
  )
}
