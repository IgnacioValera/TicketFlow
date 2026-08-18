import { useNavigate } from 'react-router-dom'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { BrandMark } from '@/components/common/BrandLogo'
import { SecondaryButton } from '@/components/common/UiControls'
import { useAuth } from '@/hooks/useAuth'
import { setLoginNotice } from '@/utils/storage'

export function ChangePasswordPage() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const finish = async () => {
    setLoginNotice('Su contraseña fue actualizada. Inicie sesión con la nueva contraseña.')
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
        <BrandMark variant="color" />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">{user?.fullName}</span>
          <SecondaryButton
            onClick={() => void logout().then(() => navigate('/login', { replace: true }))}
          >
            Cerrar sesión
          </SecondaryButton>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-10">
        <div className="rounded border border-border bg-surface p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Seguridad
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">
            Cambiar contraseña
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Iniciaste sesión con una contraseña temporal. Debes crear una nueva antes de continuar.
          </p>
          <div className="mt-6">
            <ChangePasswordForm
              currentLabel="Contraseña temporal actual"
              submitLabel="Actualizar contraseña"
              onSuccess={finish}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
