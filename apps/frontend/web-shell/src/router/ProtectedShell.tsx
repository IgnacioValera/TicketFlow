'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { ClientRedirect } from '@/components/common/ClientRedirect'
import { PageLoader } from '@/components/common/PageLoader'
import { useAuth } from '@/hooks/useAuth'
import { getHomePath, resolveSessionGate } from '@/utils/session-gate'
import { sanitizeReturnPath } from '@/utils/safe-return-path'

export function ProtectedShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const pathname = usePathname() ?? '/'
  const gate = resolveSessionGate({
    isLoading,
    isAuthenticated,
    mustChangePassword: user?.mustChangePassword,
    pathname,
  })

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
