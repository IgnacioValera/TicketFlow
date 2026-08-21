'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { Client360Page } from '@/views/crm/Client360Page'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_CLIENT_VIEW}>
      <Client360Page />
    </RoleRoute>
  )
}
