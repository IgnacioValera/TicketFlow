'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { UsersListPage } from '@/views/users/UsersListPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.USER_MANAGE}>
      <UsersListPage />
    </RoleRoute>
  )
}
