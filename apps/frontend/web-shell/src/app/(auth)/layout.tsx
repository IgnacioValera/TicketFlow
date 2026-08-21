'use client'

import type { ReactNode } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>
}
