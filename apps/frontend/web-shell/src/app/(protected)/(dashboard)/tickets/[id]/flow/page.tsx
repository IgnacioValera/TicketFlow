'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { TicketFlowPage } from '@/views/tickets/TicketFlowPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.TICKET_VIEW_OWN}>
      <TicketFlowPage />
    </RoleRoute>
  )
}
