import { useLocation, useNavigate } from 'react-router-dom'
import { canUseHistoryBack } from '@/utils/session-gate'

export function useSafeBack(fallbackPath: string) {
  const navigate = useNavigate()
  const location = useLocation()

  return () => {
    if (canUseHistoryBack(location.key)) {
      navigate(-1)
      return
    }
    navigate(fallbackPath, { replace: true })
  }
}
