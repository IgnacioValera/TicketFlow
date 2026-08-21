'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { RolesPermissionsPage } from '@/views/administration/RolesPermissionsPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.ROLE_PERMISSION_MANAGE}>
      <RolesPermissionsPage />
    </RoleRoute>
  )
}
