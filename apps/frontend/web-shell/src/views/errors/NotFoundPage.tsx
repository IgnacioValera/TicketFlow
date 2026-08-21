import { useAppNavigate } from '@/hooks/useAppNavigate'
import { ClientRedirect } from '@/components/common/ClientRedirect'
import { ErrorScreen, MissingRouteIllustration } from '@/components/common/ErrorScreen'
import { PageLoader } from '@/components/common/PageLoader'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSafeBack } from '@/hooks/useSafeBack'
import { getHomePath } from '@/utils/session-gate'

export function NotFoundPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useAppNavigate()
  const homePath = getHomePath(isAuthenticated ? user : null)
  const goBack = useSafeBack(homePath)
  useDocumentTitle('Página no encontrada — TicketFlow')

  if (isLoading) return <PageLoader />
  if (user?.mustChangePassword) return <ClientRedirect href="/change-password" />

  return (
    <ErrorScreen
      kicker="404"
      title="Página no encontrada"
      description="La dirección que intentas visitar no existe, fue modificada o ya no está disponible."
      illustration={<MissingRouteIllustration />}
      actions={
        <>
          <PrimaryButton type="button" onClick={() => navigate(homePath)}>
            Ir al inicio
          </PrimaryButton>
          <SecondaryButton type="button" onClick={goBack}>
            Volver
          </SecondaryButton>
        </>
      }
    />
  )
}
