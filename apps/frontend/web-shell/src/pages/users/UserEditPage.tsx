import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FeedbackAlert } from '@/components/common/FeedbackAlert'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ConfirmModal } from '@/components/common/Modal'
import { PrimaryButton, SelectInput } from '@/components/common/UiControls'
import { ClientSelectField } from '@/components/users/ClientSelectField'
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
  const [initialRole, setInitialRole] = useState<UserRole>('AGENT')
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmInternal, setConfirmInternal] = useState(false)
  const [submitLock] = useState(() => createSubmitLock())
  const isRequester = role === 'REQUESTER'

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const user = await usersService.getUserById(id)
        setFullName(user.fullName)
        setEmail(user.email)
        setRole(user.role)
        setInitialRole(user.role)
        setClientId(user.clientId ?? '')
        setClientName(user.clientName ?? null)
      } catch (err: unknown) {
        setError((err as { message?: string }).message || 'Error al cargar usuario')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const save = async () => {
    if (!id) return
    await submitLock.run(async () => {
      setSubmitting(true)
      try {
        await usersService.updateUser(id, {
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          clientId: isRequester ? clientId : undefined,
        })
        navigate('/users', { state: { updatedName: fullName.trim() } })
      } catch (err: unknown) {
        setError(errorMessage(err, 'Error al actualizar usuario'))
      } finally {
        setSubmitting(false)
        setConfirmInternal(false)
      }
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || submitting || submitLock.pending) return
    setError('')
    const formError = userEditFormError({ fullName, email, role, clientId })
    if (formError) {
      setError(formError)
      return
    }
    if (initialRole === 'REQUESTER' && role !== 'REQUESTER') {
      setConfirmInternal(true)
      return
    }
    await save()
  }

  if (loading) return <LoadingSkeleton variant="form" label="Cargando usuario…" />
  if (error && !fullName) return <ErrorState message={error} />

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link to="/users" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-text">Editar usuario</h1>
      </div>

      {error && fullName && (
        <div className="mb-4">
          <FeedbackAlert variant="danger" title="No se pudo guardar" message={error} />
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
          <SelectInput
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={submitting}
          >
            {roleOptionsForUser(role).map((r) => (
              <option key={r} value={r}>
                {ROLES[r]}
              </option>
            ))}
          </SelectInput>
        </div>
        {isRequester && (
          <ClientSelectField
            value={clientId}
            onChange={setClientId}
            disabled={submitting}
            required
            currentLabel={clientName}
          />
        )}
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
      <ConfirmModal
        open={confirmInternal}
        title="Quitar asociación con el cliente"
        message="Al cambiar a un rol interno se eliminará la asociación vigente con el cliente. Los tickets históricos no se modifican."
        confirmLabel="Continuar"
        onClose={() => setConfirmInternal(false)}
        onConfirm={() => void save()}
      />
    </div>
  )
}
