'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { SlaPoliciesPage } from '@/views/catalogs/SlaPoliciesPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.SLA_MANAGE}>
      <SlaPoliciesPage />
    </RoleRoute>
  )
}
