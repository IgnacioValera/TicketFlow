import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FORGOT_PASSWORD_LINK } from '@/constants/password-recovery'
import { useAuth } from '@/hooks/useAuth'
import { clearLoginNotice, peekLoginNotice } from '@/utils/storage'

export function LoginPage() {
  const { login, isAuthenticated, isLoading, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const locationState = location.state as { from?: { pathname: string }; notice?: string } | null
  const from = locationState?.from?.pathname || '/dashboard'
  const [notice] = useState(() => locationState?.notice || peekLoginNotice())

  useEffect(() => {
    if (notice) clearLoginNotice()
  }, [notice])

  if (!isLoading && isAuthenticated) {
    return <Navigate to={user?.mustChangePassword ? '/change-password' : from} replace />
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
      if (loggedInUser.mustChangePassword) {
        navigate('/change-password', { replace: true })
        return
      }
      const destination =
        loggedInUser.role === 'CLIENT' || loggedInUser.role === 'REQUESTER'
          ? '/tickets'
          : loggedInUser.role === 'SALES'
            ? '/crm/dashboard'
            : from === '/' || from === '/login'
              ? '/dashboard'
              : from
      navigate(destination, { replace: true })
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string }
      setError(apiError.message || 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Bienvenido
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">Inicia sesión</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Accede a tu espacio de atención y seguimiento.
        </p>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {notice && (
          <div className="rounded border border-success/30 bg-green-50 px-3 py-2.5 text-sm text-success">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded border border-danger/30 bg-red-50 px-3 py-2.5 text-sm text-danger">
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
            className="w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/10"
            placeholder="correo@ejemplo.com"
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
            className="w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/10"
            placeholder="Ingresa tu contraseña"
          />
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              {FORGOT_PASSWORD_LINK}
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
