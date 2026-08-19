import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { PrimaryButton } from '@/components/common/UiControls'
import { ROLES } from '@/constants/roles'
import { LIMITS } from '@/constants/validation'
import * as usersService from '@/services/users.service'
import type { UserRole } from '@/types/user.types'
import { createSubmitLock } from '@/utils/submit-lock'
import { roleOptionsForUser } from '@/utils/user-admin'
import { userEditFormError } from '@/utils/user-form'
import { errorMessage } from '@/utils/validation'

export function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('AGENT')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitLock] = useState(() => createSubmitLock())

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const user = await usersService.getUserById(id)
        setFullName(user.fullName)
        setEmail(user.email)
        setRole(user.role)
      } catch (err: unknown) {
        setError((err as { message?: string }).message || 'Error al cargar usuario')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || submitting || submitLock.pending) return
    setError('')
    const formError = userEditFormError({ fullName, email, role })
    if (formError) {
      setError(formError)
      return
    }

    await submitLock.run(async () => {
      setSubmitting(true)
      try {
        await usersService.updateUser(id, {
          fullName: fullName.trim(),
          email: email.trim(),
          role,
        })
        navigate('/users')
      } catch (err: unknown) {
        setError(errorMessage(err, 'Error al actualizar usuario'))
      } finally {
        setSubmitting(false)
      }
    })
  }

  if (loading) return <LoadingSkeleton variant="form" label="Cargando usuario…" />
  if (error && !fullName) return <ErrorState message={error} />

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link to="/users" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Administración
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text md:text-3xl">
          Editar usuario
        </h1>
        <p className="mt-2 text-sm text-muted">
          Actualiza identidad y rol. El restablecimiento de contraseña se realiza desde el listado.
        </p>
      </div>

      {error && fullName && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="ui-card space-y-5 p-6 md:p-8"
      >
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
            Nombre completo
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            maxLength={LIMITS.USER_FULL_NAME}
            disabled={submitting}
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            maxLength={LIMITS.EMAIL}
            disabled={submitting}
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium">
            Rol
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            disabled={submitting}
          >
            {roleOptionsForUser(role).map((r) => (
              <option key={r} value={r}>
                {ROLES[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <PrimaryButton type="submit" disabled={submitting} loading={submitting} loadingText="Guardando…">
            Guardar cambios
          </PrimaryButton>
          <Link
            to="/users"
            className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
