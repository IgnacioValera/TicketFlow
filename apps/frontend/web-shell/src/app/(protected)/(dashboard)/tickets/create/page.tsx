'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { TicketCreatePage } from '@/views/tickets/TicketCreatePage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.TICKET_CREATE}>
      <TicketCreatePage />
    </RoleRoute>
  )
}
