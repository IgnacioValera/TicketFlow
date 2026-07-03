import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Correo y contraseña son obligatorios')
      return
    }

    setSubmitting(true)
    try {
      const loggedInUser = await login({ email: email.trim(), password })
      const destination =
        loggedInUser.role === 'REQUESTER'
          ? '/tickets'
          : from === '/' || from === '/login'
            ? '/dashboard'
            : from
      navigate(destination, { replace: true })
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 403) {
        setError('Usuario inactivo o bloqueado')
      } else if (status === 401) {
        setError('Credenciales inválidas')
      } else {
        setError((err as { message?: string }).message || 'No se pudo iniciar sesión')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-brand-navy">Iniciar sesión</h2>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-brand-scarlet/30 bg-red-50 px-3 py-2 text-sm text-brand-scarlet">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-brand-navy">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            placeholder="usuario@empresa.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-brand-navy">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-teal py-2.5 text-sm font-medium text-white hover:bg-brand-teal/90 disabled:opacity-50"
        >
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        Demo: admin@helpdesk.com / agent@helpdesk.com — contraseña: password
      </p>
    </div>
  )
}
