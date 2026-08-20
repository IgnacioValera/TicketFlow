'use client'

import Link from 'next/link'
import { useAppNavigate } from '@/hooks/useAppNavigate'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ClientRedirect } from '@/components/common/ClientRedirect'
import { FORGOT_PASSWORD_LINK } from '@/constants/password-recovery'
import { useAuth } from '@/hooks/useAuth'
import { FeedbackAlert } from '@/components/common/FeedbackAlert'
import { PageLoader } from '@/components/common/PageLoader'
import { PasswordField } from '@/components/common/PasswordField'
import { PrimaryButton } from '@/components/common/UiControls'
import { clearLoginNotice, peekLoginNotice } from '@/utils/storage'
import { createSubmitLock } from '@/utils/submit-lock'
import { getHomePath } from '@/utils/session-gate'
import { sanitizeReturnPath } from '@/utils/safe-return-path'

export function LoginPage() {
  const { login, isAuthenticated, isLoading, user } = useAuth()
  const navigate = useAppNavigate()
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitLock] = useState(() => createSubmitLock())

  const from = sanitizeReturnPath(searchParams.get('from'), '')
  const [notice] = useState(() => peekLoginNotice())

  useEffect(() => {
    if (notice) clearLoginNotice()
  }, [notice])

  if (isLoading) return <PageLoader />

  if (isAuthenticated) {
    return <ClientRedirect href={getHomePath(user)} />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting || submitLock.pending) return
    setError('')

    if (!email.trim() || !password) {
      setError('Correo y contraseña son obligatorios')
      return
    }

    await submitLock.run(async () => {
      setSubmitting(true)
      try {
        const loggedInUser = await login({ email: email.trim(), password })
        if (loggedInUser.mustChangePassword) {
          navigate('/change-password', { replace: true })
          return
        }
        const home = getHomePath(loggedInUser)
        const destination =
          from && from !== '/' && from !== '/login' && !from.startsWith('/change-password')
            ? from
            : home
        navigate(destination, { replace: true })
      } catch (err: unknown) {
        const apiError = err as { status?: number; message?: string }
        setError(apiError.message || 'No se pudo iniciar sesión')
      } finally {
        setSubmitting(false)
      }
    })
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
        {notice && <FeedbackAlert title="Contraseña actualizada" message={notice} />}
        {error && (
          <FeedbackAlert variant="danger" title="No se pudo iniciar sesión" message={error} />
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
            disabled={submitting}
            className="w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-4 focus:ring-brand-teal/10"
            placeholder="correo@ejemplo.com"
          />
        </div>
        <div>
          <PasswordField
            id="password"
            label="Contraseña"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            placeholder="Ingresa tu contraseña"
          />
          <div className="mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              {FORGOT_PASSWORD_LINK}
            </Link>
          </div>
        </div>
        <PrimaryButton type="submit" className="w-full py-2.5" disabled={submitting} loading={submitting} loadingText="Ingresando…">
          Ingresar
        </PrimaryButton>
      </form>
    </div>
  )
}
