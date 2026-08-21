'use client'

import { RenderErrorPage } from '@/views/errors/RenderErrorPage'
import { NotFoundPage } from '@/views/errors/NotFoundPage'

export default function Page() {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== 'true') {
    return <NotFoundPage />
  }
  return <RenderErrorPage />
}
