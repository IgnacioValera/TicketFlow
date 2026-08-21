'use client'

import { Suspense } from 'react'
import { PageLoader } from '@/components/common/PageLoader'
import { RoleRoute } from '@/router/RoleRoute'
import { ActivitiesPage } from '@/views/crm/ActivitiesPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_ACTIVITY_VIEW}>
      <Suspense fallback={<PageLoader />}><ActivitiesPage /></Suspense>
    </RoleRoute>
  )
}
