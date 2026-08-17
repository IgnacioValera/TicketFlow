import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { AppIcon } from '@/components/common/AppIcon'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { SurfaceCard } from '@/components/common/SurfaceCard'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import { ROLES } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const statusLabels = {
  ACTIVE: 'Cuenta activa',
  INACTIVE: 'Cuenta inactiva',
  LOCKED: 'Cuenta bloqueada',
}

export function ProfilePage() {
  const { user, refreshProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await refreshProfile()
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudo cargar el perfil')
    } finally {
      setLoading(false)
    }
  }, [refreshProfile])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const permissionModules = useMemo(() => {
    if (!user) return []
    const labels = new Map<string, number>()
    user.permissions.forEach((permission) => {
      const module = permission.split('_')[0]
      labels.set(module, (labels.get(module) ?? 0) + 1)
    })
    return [...labels.entries()].map(([name, count]) => ({ name, count }))
  }, [user])

  if (loading && !user) return <LoadingSkeleton variant="profile" />
  if (error && !user) return <ErrorState message={error} onRetry={() => void loadProfile()} />
  if (!user) return null

  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Primera sesión'
  const createdAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-MX', { dateStyle: 'long' })
    : 'Cuenta institucional'

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Cuenta"
        title="Mi perfil"
        description="Consulta tu identidad, acceso y actividad dentro de TicketFlow."
      />

      {error && (
        <div className="rounded border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <SurfaceCard className="p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div
              className="grid h-20 w-20 shrink-0 place-items-center rounded bg-primary text-2xl font-semibold text-white"
              aria-hidden
            >
              {initials(user.fullName)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-semibold text-text">{user.fullName}</h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    user.status === 'ACTIVE'
                      ? 'bg-success/10 text-success'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'}`}
                  />
                  {statusLabels[user.status]}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <AppIcon name="mail" className="h-4 w-4" />
                {user.email}
              </p>
              <p className="mt-2 inline-flex rounded-full border border-border bg-page px-3 py-1 text-xs font-medium text-text">
                {ROLES[user.role]}
              </p>
            </div>
          </div>
          <PrimaryButton disabled={loading} onClick={() => void loadProfile()}>
            <AppIcon name="refresh" className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar perfil
          </PrimaryButton>
        </div>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded bg-primary/10 text-primary">
              <AppIcon name="profile" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold">Información de la cuenta</h3>
              <p className="text-xs text-muted">Datos asociados a tu sesión</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info icon="profile" label="Nombre completo" value={user.fullName} />
            <Info icon="mail" label="Correo electrónico" value={user.email} />
            <Info icon="user-check" label="Rol operativo" value={ROLES[user.role]} />
            <Info icon="calendar" label="Miembro desde" value={createdAt} />
          </dl>
        </SurfaceCard>

        <SurfaceCard className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded bg-warning/10 text-warning">
              <AppIcon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold">Seguridad y sesión</h3>
              <p className="text-xs text-muted">Estado actual de acceso</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <SecurityRow
              label="Estado"
              value={statusLabels[user.status]}
              good={user.status === 'ACTIVE'}
            />
            <SecurityRow label="Último acceso" value={lastLogin} />
            <SecurityRow label="Autorización" value="Permisos dinámicos activos" good />
            <div className="pt-1">
              <SecondaryButton onClick={() => setChangeOpen(true)}>
                Cambiar contraseña
              </SecondaryButton>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Alcance de acceso</h3>
            <p className="mt-1 text-xs text-muted">
              {user.permissions.length} privilegios habilitados para tu rol.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <AppIcon name="check" className="h-3.5 w-3.5" />
            Acceso sincronizado
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {permissionModules.map(({ name, count }) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 rounded border border-border bg-page px-3 py-2 text-xs font-medium text-text"
            >
              <span className="grid h-6 w-6 place-items-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                {count}
              </span>
              {moduleLabel(name)}
            </span>
          ))}
        </div>
      </SurfaceCard>

      <Modal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        title="Cambiar contraseña"
        size="md"
      >
        <ChangePasswordForm
          currentLabel="Contraseña actual"
          submitLabel="Actualizar contraseña"
          onCancel={() => setChangeOpen(false)}
          onSuccess={async () => {
            setChangeOpen(false)
            await logout()
            navigate('/login', {
              replace: true,
              state: { notice: 'Tu contraseña se actualizó correctamente.' },
            })
          }}
        />
      </Modal>
    </div>
  )
}

function moduleLabel(value: string) {
  const labels: Record<string, string> = {
    TICKET: 'Tickets',
    COMMENT: 'Comentarios',
    ATTACHMENT: 'Adjuntos',
    DASHBOARD: 'Panel',
    REPORT: 'Reportes',
    USER: 'Usuarios',
    CATEGORY: 'Categorías',
    PRIORITY: 'Prioridades',
    SLA: 'SLA',
    KNOWLEDGE: 'Conocimiento',
    SURVEY: 'Encuestas',
    CRM: 'CRM',
    LOGIN: 'Autenticación',
  }
  return labels[value] ?? value
}

function Info({
  icon,
  label,
  value,
}: {
  icon: 'profile' | 'mail' | 'user-check' | 'calendar'
  label: string
  value: string
}) {
  return (
    <div className="rounded border border-border bg-page p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <AppIcon name={icon} className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-text">{value}</p>
    </div>
  )
}

function SecurityRow({
  label,
  value,
  good = false,
}: {
  label: string
  value: string
  good?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className={`text-right text-xs font-semibold ${good ? 'text-success' : 'text-text'}`}>
        {value}
      </span>
    </div>
  )
}
