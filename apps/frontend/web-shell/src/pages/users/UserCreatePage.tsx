import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FeedbackAlert } from '@/components/common/FeedbackAlert'
import { PasswordRequirements } from '@/components/common/PasswordRequirements'
import { PrimaryButton, SelectInput } from '@/components/common/UiControls'
import { ClientSelectField } from '@/components/users/ClientSelectField'
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
  const [clientId, setClientId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitLock] = useState(() => createSubmitLock())
  const isRequester = role === 'REQUESTER'

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
      clientId,
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
          clientId: isRequester ? clientId : undefined,
        })
        navigate('/users', { state: { createdName: fullName.trim() } })
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
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-text">Nuevo usuario</h1>
      </div>

      {error && (
        <div className="mb-4">
          <FeedbackAlert variant="danger" title="No se pudo crear el usuario" message={error} />
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
          <SelectInput
            id="role"
            value={role}
            onChange={(e) => {
              const next = e.target.value as UserRole
              setRole(next)
              if (next !== 'REQUESTER') setClientId('')
            }}
            disabled={submitting}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLES[r]}
              </option>
            ))}
          </SelectInput>
        </div>
        {isRequester && (
          <ClientSelectField value={clientId} onChange={setClientId} disabled={submitting} required />
        )}
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
