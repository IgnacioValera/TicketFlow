import { useNavigate } from 'react-router-dom'
import { ErrorScreen, RestrictedIllustration } from '@/components/common/ErrorScreen'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSafeBack } from '@/hooks/useSafeBack'
import { getHomePath } from '@/utils/session-gate'

export function ForbiddenPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const homePath = getHomePath(user)
  const goBack = useSafeBack(homePath)
  useDocumentTitle('Acceso restringido — TicketFlow')

  return (
    <ErrorScreen
      kicker="Acceso"
      title="Acceso restringido"
      description="No tienes permisos para consultar esta sección."
      illustration={<RestrictedIllustration />}
      actions={
        <>
          <PrimaryButton type="button" onClick={() => navigate(homePath)}>
            Ir a mi panel
          </PrimaryButton>
          <SecondaryButton type="button" onClick={goBack}>
            Volver
          </SecondaryButton>
        </>
      }
    />
  )
}
