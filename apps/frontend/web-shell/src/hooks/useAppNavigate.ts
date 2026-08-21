'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

type NavigateOptions = { replace?: boolean }

/**
 * Compat layer: navigate(path) / navigate(path, { replace }) / navigate(-1)
 */
export function useAppNavigate() {
  const router = useRouter()

  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        if (to < 0) router.back()
        else router.forward()
        return
      }
      if (options?.replace) router.replace(to)
      else router.push(to)
    },
    [router],
  )
}
