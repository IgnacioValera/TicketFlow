'use client'

import { Suspense } from 'react'
import { PageLoader } from '@/components/common/PageLoader'
import { RoleRoute } from '@/router/RoleRoute'
import { OpportunitiesPage } from '@/views/crm/OpportunitiesPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_OPPORTUNITY_VIEW}>
      <Suspense fallback={<PageLoader />}><OpportunitiesPage /></Suspense>
    </RoleRoute>
  )
}
