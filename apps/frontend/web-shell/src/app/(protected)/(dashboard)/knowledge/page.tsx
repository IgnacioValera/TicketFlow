'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { KnowledgePage } from '@/views/knowledge/KnowledgePage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.KNOWLEDGE_MANAGE}>
      <KnowledgePage />
    </RoleRoute>
  )
}
