'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type SetSearchParamsOptions = { replace?: boolean }

/**
 * Compat with react-router useSearchParams setSearchParams(URLSearchParams, { replace }).
 */
export function useAppSearchParams() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams() ?? new URLSearchParams()

  const setSearchParams = useCallback(
    (next: URLSearchParams, options?: SetSearchParamsOptions) => {
      const query = next.toString()
      const href = query ? `${pathname}?${query}` : pathname
      if (options?.replace) router.replace(href)
      else router.push(href)
    },
    [pathname, router],
  )

  return [searchParams, setSearchParams] as const
}
