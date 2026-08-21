import type { SurveyTrigger } from '@/types/crm.types'

export type InvitationCardStatus =
  | 'UNCONFIGURED'
  | 'NOT_GENERATED'
  | 'PENDING'
  | 'RESPONDED'
  | 'EXPIRED'
  | 'REVOKED'

export interface SurveyInvitationCard {
  status: InvitationCardStatus
  surveyId?: string | null
  surveyTitle?: string | null
  trigger?: SurveyTrigger | null
  createdAt?: string | null
  expiresAt?: string | null
  usedAt?: string | null
}

export interface CreatedSurveyInvitation {
  created: boolean
  surveyId?: string
  surveyTitle?: string
  responseUrl?: string
  expiresAt?: string
  message?: string
}

export const INVITATION_STATUS_LABELS: Record<InvitationCardStatus, string> = {
  UNCONFIGURED: 'No configurada',
  NOT_GENERATED: 'No generada',
  PENDING: 'Pendiente de respuesta',
  RESPONDED: 'Respondida',
  EXPIRED: 'Enlace expirado',
  REVOKED: 'Revocada',
}

export function canRegenerateInvitation(status: InvitationCardStatus) {
  return status === 'EXPIRED' || status === 'REVOKED' || status === 'PENDING'
}

export function canRetryAutomaticInvitation(stage: string, status: InvitationCardStatus) {
  return stage === 'WON' && status === 'NOT_GENERATED'
}

export function invitationRequestSurveyId(input: {
  selectedManualId: string
  stage: string
  cardSurveyId?: string | null
  confirmRegenerate?: boolean
}): string | undefined {
  if (input.selectedManualId) return input.selectedManualId
  if (input.confirmRegenerate || input.stage === 'WON') return input.cardSurveyId || undefined
  return undefined
}

export function invitationCardStatus(input: {
  hasPublishedAutomaticSurvey: boolean
  invitation?: {
    usedAt?: string | null
    expiresAt: string
    revokedAt?: string | null
  } | null
  now?: Date
}): InvitationCardStatus {
  const now = input.now ?? new Date()
  if (!input.invitation) return input.hasPublishedAutomaticSurvey ? 'NOT_GENERATED' : 'UNCONFIGURED'
  if (input.invitation.usedAt) return 'RESPONDED'
  if (input.invitation.revokedAt) return 'REVOKED'
  if (new Date(input.invitation.expiresAt).getTime() < now.getTime()) return 'EXPIRED'
  return 'PENDING'
}

export function invitationCopyWarning(copied: boolean) {
  return copied ? null : 'Copia el enlace antes de cerrar. Por seguridad no volverá a mostrarse.'
}

export function isRegenerateConfirmation(message: string) {
  return message.toLowerCase().includes('confirma la regeneración del enlace')
}

export async function copyTextToClipboard(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    /* fallback below */
  }
  try {
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}
