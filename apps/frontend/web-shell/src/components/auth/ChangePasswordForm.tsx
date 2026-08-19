import { useState, type FormEvent } from 'react'
import { PasswordField } from '@/components/common/PasswordField'
import { PasswordRequirements } from '@/components/common/PasswordRequirements'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import { errorMessage } from '@/utils/validation'
import { newPasswordFormError } from '@/utils/password-form'
import { createSubmitLock } from '@/utils/submit-lock'
import * as authService from '@/services/auth.service'

interface ChangePasswordFormProps {
  currentLabel: string
  submitLabel: string
  onCancel?: () => void
  onSuccess: () => Promise<void> | void
}

export function ChangePasswordForm({
  currentLabel,
  submitLabel,
  onCancel,
  onSuccess,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitLock] = useState(() => createSubmitLock())

  const formError = newPasswordFormError(currentPassword, newPassword, confirmation)
  const canSubmit = !formError && !submitting

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting || submitLock.pending) return
    setError('')
    if (formError) {
      setError(formError)
      return
    }
    await submitLock.run(async () => {
      setSubmitting(true)
      try {
        await authService.changePassword({ currentPassword, newPassword })
        await onSuccess()
      } catch (err: unknown) {
        setError(errorMessage(err, 'No se pudo actualizar la contraseña'))
      } finally {
        setSubmitting(false)
      }
    })
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      {error && (
        <div className="rounded border border-danger/30 bg-red-50 px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}
      <PasswordField
        id="currentPassword"
        label={currentLabel}
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        autoComplete="current-password"
        disabled={submitting}
      />
      <div>
        <PasswordField
          id="newPassword"
          label="Nueva contraseña"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          disabled={submitting}
        />
        <PasswordRequirements password={newPassword} />
      </div>
      <PasswordField
        id="confirmPassword"
        label="Confirmar nueva contraseña"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        autoComplete="new-password"
        disabled={submitting}
      />
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        {onCancel && (
          <SecondaryButton type="button" onClick={onCancel} disabled={submitting}>
            Cancelar
          </SecondaryButton>
        )}
        <PrimaryButton type="submit" disabled={!canSubmit} loading={submitting} loadingText="Actualizando…">
          {submitLabel}
        </PrimaryButton>
      </div>
    </form>
  )
}
