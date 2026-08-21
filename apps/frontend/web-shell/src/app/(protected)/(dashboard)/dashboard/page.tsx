'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { DashboardPlaceholderPage } from '@/views/dashboard/DashboardPlaceholderPage'

export default function Page() {
  return (
    <RoleRoute path="/dashboard">
      <DashboardPlaceholderPage />
    </RoleRoute>
  )
}
