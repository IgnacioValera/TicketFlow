'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { SurveyBuilderPage } from '@/views/crm/SurveyBuilderPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_SURVEY_MANAGE}>
      <SurveyBuilderPage />
    </RoleRoute>
  )
}
