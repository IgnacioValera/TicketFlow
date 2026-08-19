import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { PasswordRequirements } from '@/components/common/PasswordRequirements'
import { PrimaryButton } from '@/components/common/UiControls'
import { ASSIGNABLE_ROLES, ROLES } from '@/constants/roles'
import { LIMITS } from '@/constants/validation'
import * as usersService from '@/services/users.service'
import type { UserRole } from '@/types/user.types'
import { createSubmitLock } from '@/utils/submit-lock'
import { userCreateFormError } from '@/utils/user-form'
import { errorMessage } from '@/utils/validation'

export function UserCreatePage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('AGENT')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitLock] = useState(() => createSubmitLock())

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting || submitLock.pending) return
    setError('')
    const formError = userCreateFormError({
      fullName,
      email,
      password,
      confirmPassword,
      role,
    })
    if (formError) {
      setError(formError)
      return
    }

    await submitLock.run(async () => {
      setSubmitting(true)
      try {
        await usersService.createUser({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role,
        })
        navigate('/users')
      } catch (err: unknown) {
        setError(errorMessage(err, 'Error al crear usuario'))
      } finally {
        setSubmitting(false)
      }
    })
  }

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
          Nuevo usuario
        </h1>
        <p className="mt-2 text-sm text-muted">
          Crea una identidad y asigna su alcance inicial.
        </p>
      </div>

      {error && <ErrorState message={error} />}

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
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Contraseña inicial
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            autoComplete="new-password"
            disabled={submitting}
          />
          <PasswordRequirements password={password} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
            autoComplete="new-password"
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
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLES[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <PrimaryButton type="submit" disabled={submitting} loading={submitting} loadingText="Guardando…">
            Crear usuario
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
