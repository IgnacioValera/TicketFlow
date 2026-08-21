'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { ContactsPage } from '@/views/crm/ContactsPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.CRM_CONTACT_VIEW}>
      <ContactsPage />
    </RoleRoute>
  )
}
