'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoader } from '@/components/common/PageLoader'

export function ClientRedirect({ href }: { href: string }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(href)
  }, [href, router])

  return <PageLoader />
}
