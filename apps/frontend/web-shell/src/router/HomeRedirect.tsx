'use client'

import { ClientRedirect } from '@/components/common/ClientRedirect'
import { useAuth } from '@/hooks/useAuth'
import { getHomePath } from '@/utils/session-gate'

export function HomeRedirect() {
  const { user } = useAuth()
  return <ClientRedirect href={getHomePath(user)} />
}
