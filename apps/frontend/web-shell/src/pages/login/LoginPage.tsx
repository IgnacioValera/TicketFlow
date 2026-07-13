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
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c8191]">Bienvenido</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-brand-navy">
          Inicia sesión
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#7b7181]">
          Accede a tu espacio de atención y seguimiento.
        </p>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-brand-scarlet/25 bg-[#fff1ee] px-3 py-2.5 text-sm text-brand-scarlet">
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
            className="w-full rounded-xl border border-[#d9d1dd] bg-[#fffefd] px-3.5 py-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/10"
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
            className="w-full rounded-xl border border-[#d9d1dd] bg-[#fffefd] px-3.5 py-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/10"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-teal py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(111,79,216,.22)] hover:bg-[#6040c8] disabled:opacity-50"
        >
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      <div className="mt-6 rounded-xl border border-[#e5dfe8] bg-[#faf8fb] p-3 text-center text-[11px] leading-5 text-[#807687]">
        Demo: <strong>admin@helpdesk.com</strong>
        <br />
        Contraseña: <strong>password</strong>
      </div>
    </div>
  )
}
