import { useNavigate } from 'react-router-dom'
import { ErrorScreen, UnexpectedIllustration } from '@/components/common/ErrorScreen'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getHomePath } from '@/utils/session-gate'

export function UnexpectedErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const homePath = getHomePath(isAuthenticated ? user : null)
  useDocumentTitle('Ocurrió un problema — TicketFlow')

  return (
    <ErrorScreen
      kicker="Error"
      title="Ocurrió un problema"
      description="No fue posible mostrar esta sección. Intenta nuevamente."
      illustration={<UnexpectedIllustration />}
      actions={
        <>
          <PrimaryButton type="button" onClick={onRetry}>
            Reintentar
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => navigate(homePath)}>
            Ir al inicio
          </SecondaryButton>
        </>
      }
    />
  )
}
