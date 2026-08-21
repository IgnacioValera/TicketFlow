'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { PrioritiesPage } from '@/views/catalogs/PrioritiesPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.PRIORITY_MANAGE}>
      <PrioritiesPage />
    </RoleRoute>
  )
}
