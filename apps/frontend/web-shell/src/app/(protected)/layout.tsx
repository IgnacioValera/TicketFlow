'use client'

import type { ReactNode } from 'react'
import { ProtectedShell } from '@/router/ProtectedShell'

export default function ProtectedGroupLayout({ children }: { children: ReactNode }) {
  return <ProtectedShell>{children}</ProtectedShell>
}
