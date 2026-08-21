'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { CategoriesPage } from '@/views/catalogs/CategoriesPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CATEGORY_MANAGE}>
      <CategoriesPage />
    </RoleRoute>
  )
}
