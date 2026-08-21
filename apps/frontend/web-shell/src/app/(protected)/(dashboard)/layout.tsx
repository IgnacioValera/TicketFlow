'use client'

import type { ReactNode } from 'react'
import { DashboardLayout } from '@/layouts/DashboardLayout'

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
