'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { ClientRedirect } from '@/components/common/ClientRedirect'
import { ErrorState } from '@/components/common/ErrorState'
import { PageLoader } from '@/components/common/PageLoader'
import { useAuth } from '@/hooks/useAuth'
import { getHomePath, resolveSessionGate } from '@/utils/session-gate'
import { sanitizeReturnPath } from '@/utils/safe-return-path'

export function ProtectedShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, sessionError, retrySession, user } = useAuth()
  const pathname = usePathname() ?? '/'
  const gate = resolveSessionGate({
    isLoading,
    isAuthenticated,
    mustChangePassword: user?.mustChangePassword,
    pathname,
  })

  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-5">
        <div className="w-full max-w-lg">
          <ErrorState message={sessionError} onRetry={() => void retrySession()} />
        </div>
      </div>
    )
  }
  if (gate === 'loader') return <PageLoader />
  if (gate === 'login') {
    const from = sanitizeReturnPath(`${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`)
    const href = from && from !== '/' ? `/login?from=${encodeURIComponent(from)}` : '/login'
    return <ClientRedirect href={href} />
  }
  if (gate === 'change-password') return <ClientRedirect href="/change-password" />
  if (gate === 'home') return <ClientRedirect href={getHomePath(user)} />

  return <>{children}</>
}
