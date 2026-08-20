import { useAppNavigate } from '@/hooks/useAppNavigate'
import { usePathname } from 'next/navigation'
import { canUseHistoryBack } from '@/utils/session-gate'

export function useSafeBack(fallbackPath: string) {
  const navigate = useAppNavigate()
  const pathname = usePathname() ?? ''

  return () => {
    if (canUseHistoryBack(pathname)) {
      navigate(-1)
      return
    }
    navigate(fallbackPath, { replace: true })
  }
}
