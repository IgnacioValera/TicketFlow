'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { CrmDashboardPage } from '@/views/crm/CrmDashboardPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_DASHBOARD}>
      <CrmDashboardPage />
    </RoleRoute>
  )
}
