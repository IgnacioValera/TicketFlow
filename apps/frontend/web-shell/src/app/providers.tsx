'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AuthProvider } from '@/hooks/useAuth'
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary'
import { PageLoader } from '@/components/common/PageLoader'

let mocksReadyPromise: Promise<void> | null = null
let mocksAreReady = process.env.NEXT_PUBLIC_USE_MOCKS !== 'true'

function ensureMocks() {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== 'true') {
    return Promise.resolve()
  }
  if (!mocksReadyPromise) {
    mocksReadyPromise = import('@/mocks/handlers').then(({ enableMocking }) => enableMocking()).then(() => {
      mocksAreReady = true
    })
  }
  return mocksReadyPromise
}

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(mocksAreReady)

  useEffect(() => {
    let cancelled = false
    void ensureMocks().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return <PageLoader />

  return (
    <AuthProvider>
      <AppErrorBoundary>{children}</AppErrorBoundary>
    </AuthProvider>
  )
}
