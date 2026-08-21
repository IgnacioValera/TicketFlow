'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { TicketDetailPage } from '@/views/tickets/TicketDetailPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.TICKET_VIEW_OWN}>
      <TicketDetailPage />
    </RoleRoute>
  )
}
