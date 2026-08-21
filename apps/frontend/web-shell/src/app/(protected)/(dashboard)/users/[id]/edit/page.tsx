'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { UserEditPage } from '@/views/users/UserEditPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.USER_MANAGE}>
      <UserEditPage />
    </RoleRoute>
  )
}
