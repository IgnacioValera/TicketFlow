import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { ROLES } from '@/constants/roles'
import * as usersService from '@/services/users.service'
import type { UserRole } from '@/types/user.types'

export function UserCreatePage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('REQUESTER')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

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
      setError((err as { message?: string }).message || 'Error al crear usuario')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link to="/users" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-navy">Nuevo usuario</h1>
      </div>

      {error && <ErrorState message={error} />}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4 rounded-xl border border-brand-slate/40 bg-white p-6"
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
          >
            {(Object.keys(ROLES) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLES[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Crear usuario'}
          </button>
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
