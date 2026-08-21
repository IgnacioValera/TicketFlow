'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { UserCreatePage } from '@/views/users/UserCreatePage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.USER_MANAGE}>
      <UserCreatePage />
    </RoleRoute>
  )
}
