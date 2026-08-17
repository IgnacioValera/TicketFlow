import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SecondaryButton } from '@/components/common/UiControls'
import {
  ACCESS_RECOVERY_COPY_TEXT,
  ACCESS_RECOVERY_INSTRUCTIONS,
  ACCESS_RECOVERY_TITLE,
} from '@/constants/password-recovery'

export function ForgotPasswordPage() {
  const [copied, setCopied] = useState(false)

  const copyInstructions = async () => {
    await navigator.clipboard.writeText(ACCESS_RECOVERY_COPY_TEXT)
    setCopied(true)
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Acceso</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">{ACCESS_RECOVERY_TITLE}</h2>
      </div>
      <div className="space-y-4 text-sm leading-6 text-muted">
        {ACCESS_RECOVERY_INSTRUCTIONS.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Volver al inicio de sesión
        </Link>
        <SecondaryButton onClick={() => void copyInstructions()}>
          {copied ? 'Instrucciones copiadas' : 'Copiar instrucciones'}
        </SecondaryButton>
      </div>
    </div>
  )
}
