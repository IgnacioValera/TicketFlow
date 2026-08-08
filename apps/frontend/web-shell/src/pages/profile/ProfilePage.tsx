import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
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
  const { user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c8191]">Cuenta</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">Mi perfil</h1>
        <p className="mt-2 text-sm text-[#746a7a]">
          Consulta tu identidad, acceso y actividad dentro de TicketFlow.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-[#f0c8c2] bg-[#fff1ee] px-4 py-3 text-sm text-[#b94f45]">
          {error}
        </div>
      )}

      <section className="relative overflow-hidden rounded-[24px] border border-[#dfd8e3] bg-[#302938] p-6 text-white shadow-[0_20px_55px_rgba(48,41,56,0.15)] md:p-8">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#7d5ce1]/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[22px] border border-white/20 bg-gradient-to-br from-[#8060e5] to-[#d86f5b] text-2xl font-black shadow-xl">
              {initials(user.fullName)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-bold">{user.fullName}</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#45b88a]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7be0b8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#66d5a9]" />
                  {statusLabels[user.status]}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-white/60">
                <AppIcon name="mail" className="h-4 w-4" />
                {user.email}
              </p>
              <p className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#d8ccfa]">
                {ROLES[user.role]}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadProfile()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
          >
            <AppIcon name="refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar perfil
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-[#e2dce5] bg-white p-5 shadow-[0_10px_35px_rgba(61,45,69,0.05)] md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee9fb] text-[#6f4fd8]">
              <AppIcon name="profile" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold">Información de la cuenta</h3>
              <p className="text-xs text-[#897f8e]">Datos asociados a tu sesión</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info icon="profile" label="Nombre completo" value={user.fullName} />
            <Info icon="mail" label="Correo electrónico" value={user.email} />
            <Info icon="user-check" label="Rol operativo" value={ROLES[user.role]} />
            <Info icon="calendar" label="Miembro desde" value={createdAt} />
          </dl>
        </section>

        <section className="rounded-2xl border border-[#e2dce5] bg-white p-5 shadow-[0_10px_35px_rgba(61,45,69,0.05)] md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0e8] text-[#d35f47]">
              <AppIcon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold">Seguridad y sesión</h3>
              <p className="text-xs text-[#897f8e]">Estado actual de acceso</p>
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
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#e2dce5] bg-white p-5 shadow-[0_10px_35px_rgba(61,45,69,0.05)] md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold">Alcance de acceso</h3>
            <p className="mt-1 text-xs text-[#897f8e]">
              {user.permissions.length} privilegios habilitados para tu rol.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eef9f4] px-3 py-1.5 text-xs font-bold text-[#27825f]">
            <AppIcon name="check" className="h-3.5 w-3.5" />
            Acceso sincronizado
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {permissionModules.map(({ name, count }) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e2dbe5] bg-[#faf8fb] px-3 py-2 text-xs font-semibold text-[#625969]"
            >
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#eee9fb] text-[10px] font-black text-[#6f4fd8]">
                {count}
              </span>
              {moduleLabel(name)}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

function moduleLabel(value: string) {
  const labels: Record<string, string> = {
    TICKET: 'Tickets',
    COMMENT: 'Comentarios',
    ATTACHMENT: 'Adjuntos',
    DASHBOARD: 'Dashboard',
    REPORT: 'Reportes',
    USER: 'Usuarios',
    CATEGORY: 'Categorías',
    PRIORITY: 'Prioridades',
    SLA: 'SLA',
    KNOWLEDGE: 'Conocimiento',
    SURVEY: 'Encuestas',
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
    <div className="rounded-xl border border-[#ebe5ed] bg-[#fcfbfa] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#8b818f]">
        <AppIcon name={icon} className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-bold text-[#3c3541]">{value}</p>
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
    <div className="flex items-center justify-between gap-4 border-b border-[#eee8ef] pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-semibold text-[#887e8d]">{label}</span>
      <span
        className={`text-right text-xs font-bold ${good ? 'text-[#27825f]' : 'text-[#4c444f]'}`}
      >
        {value}
      </span>
    </div>
  )
}
