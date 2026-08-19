import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton, SecondaryButton } from '@/components/common/UiControls'
import type { CreatedSurveyInvitation } from '@/utils/opportunity-survey'
import { invitationCopyWarning } from '@/utils/opportunity-survey'
import { formatDate } from '@/utils/labels'

interface SurveyInvitationModalProps {
  invitation: CreatedSurveyInvitation | null
  onClose: () => void
}

export function SurveyInvitationModal({ invitation, onClose }: SurveyInvitationModalProps) {
  const [copied, setCopied] = useState(false)
  const copiedRef = useRef(false)

  useEffect(() => {
    setCopied(false)
    copiedRef.current = false
  }, [invitation?.responseUrl])

  if (!invitation?.created || !invitation.responseUrl) return null

  const close = () => {
    const warning = invitationCopyWarning(copiedRef.current)
    if (warning && !window.confirm(warning)) return
    onClose()
  }

  const copy = async () => {
    await navigator.clipboard.writeText(invitation.responseUrl ?? '')
    copiedRef.current = true
    setCopied(true)
  }

  const openSurvey = () => {
    window.open(invitation.responseUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal open onClose={close} title="Encuesta generada" size="md">
      <p className="text-sm text-slate-700">
        Se creó la encuesta “{invitation.surveyTitle}” para esta oportunidad.
      </p>
      <p className="mt-3 break-all rounded bg-slate-50 px-3 py-2 font-mono text-xs text-brand-navy">
        {invitation.responseUrl}
      </p>
      <p className="mt-3 text-sm text-slate-600">
        El enlace estará disponible hasta el {formatDate(invitation.expiresAt)} y podrá responderse una sola vez.
      </p>
      <p className="mt-2 text-sm font-medium text-brand-navy">
        Copia el enlace ahora. Por seguridad, no volverá a mostrarse.
      </p>
      {copied ? <p className="mt-2 text-sm text-emerald-700">Enlace copiado</p> : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <SecondaryButton type="button" onClick={() => void copy()}>
          Copiar enlace
        </SecondaryButton>
        <SecondaryButton type="button" onClick={openSurvey}>
          Abrir encuesta
        </SecondaryButton>
        <PrimaryButton type="button" onClick={close}>
          Finalizar
        </PrimaryButton>
      </div>
    </Modal>
  )
}
