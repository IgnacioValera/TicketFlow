'use client'

import { RoleRoute } from '@/router/RoleRoute'
import { KnowledgeDetailPage } from '@/views/knowledge/KnowledgeDetailPage'
import { PERMISSIONS } from '@/constants/permissions'

export default function Page() {
  return (
    <RoleRoute permission={PERMISSIONS.KNOWLEDGE_MANAGE}>
      <KnowledgeDetailPage />
    </RoleRoute>
  )
}
