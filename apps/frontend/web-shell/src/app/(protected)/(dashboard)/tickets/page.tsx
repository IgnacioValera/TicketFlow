'use client'

import { Suspense } from 'react'
import { RoleRoute } from '@/router/RoleRoute'
import { TicketsListPage } from '@/views/tickets/TicketsListPage'
import { PageLoader } from '@/components/common/PageLoader'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.TICKET_VIEW_OWN}>
      <Suspense fallback={<PageLoader />}>
        <TicketsListPage />
      </Suspense>
    </RoleRoute>
  )
}
