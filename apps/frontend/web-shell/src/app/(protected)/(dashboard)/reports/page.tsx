'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { ReportsPage } from '@/views/reports/ReportsPage'

export default function Page() {
  return (
    <RoleRoute path="/reports">
      <ReportsPage />
    </RoleRoute>
  )
}
