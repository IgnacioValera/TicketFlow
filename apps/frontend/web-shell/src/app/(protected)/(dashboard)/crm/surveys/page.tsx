'use client'

import { Suspense } from 'react'
import { PageLoader } from '@/components/common/PageLoader'
import { RoleRoute } from '@/router/RoleRoute'
import { SurveysPage } from '@/views/crm/SurveysPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_SURVEY_VIEW}>
      <Suspense fallback={<PageLoader />}><SurveysPage /></Suspense>
    </RoleRoute>
  )
}
