import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ROLES } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'

export function ProfilePage() {
  const { user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        await refreshProfile()
      } catch (err: unknown) {
        setError((err as { message?: string }).message || 'No se pudo cargar el perfil')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [refreshProfile])

  if (loading && !user) return <LoadingSkeleton variant="profile" />
  if (error) return <ErrorState message={error} onRetry={() => void refreshProfile()} />
  if (!user) return null

  const statusLabels = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    LOCKED: 'Bloqueado',
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-brand-navy">Mi perfil</h1>
      <div className="max-w-xl rounded-xl border border-brand-slate/40 bg-white p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Nombre</dt>
            <dd className="mt-1 text-sm text-brand-navy">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Correo</dt>
            <dd className="mt-1 text-sm text-brand-navy">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Rol</dt>
            <dd className="mt-1 text-sm text-brand-navy">{ROLES[user.role]}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Estado</dt>
            <dd className="mt-1 text-sm text-brand-navy">{statusLabels[user.status]}</dd>
          </div>
          {user.lastLoginAt && (
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Último acceso</dt>
              <dd className="mt-1 text-sm text-brand-navy">
                {new Date(user.lastLoginAt).toLocaleString('es-MX')}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
