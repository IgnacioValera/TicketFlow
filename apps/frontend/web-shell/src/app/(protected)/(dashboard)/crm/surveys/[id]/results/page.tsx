'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { SurveyResultsPage } from '@/views/crm/SurveyResultsPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_SURVEY_RESULTS}>
      <SurveyResultsPage />
    </RoleRoute>
  )
}
