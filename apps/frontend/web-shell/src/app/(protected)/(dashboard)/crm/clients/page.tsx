'use client'

import { Suspense } from 'react'
import { PageLoader } from '@/components/common/PageLoader'
import { RoleRoute } from '@/router/RoleRoute'
import { ClientsListPage } from '@/views/crm/ClientsListPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_CLIENT_VIEW}>
      <Suspense fallback={<PageLoader />}><ClientsListPage /></Suspense>
    </RoleRoute>
  )
}
