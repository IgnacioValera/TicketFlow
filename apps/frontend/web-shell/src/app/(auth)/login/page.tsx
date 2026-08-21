'use client'

import { Suspense } from 'react'
import { LoginPage } from '@/views/login/LoginPage'
import { PageLoader } from '@/components/common/PageLoader'

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginPage />
    </Suspense>
  )
}
