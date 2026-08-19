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
  return status === 'EXPIRED' || status === 'REVOKED'
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
  return copied ? null : '¿Cerrar sin copiar el enlace? Por seguridad no volverá a mostrarse.'
}
