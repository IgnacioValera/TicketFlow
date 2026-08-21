import { OpportunityStage, SurveyTrigger } from '../database/entities'

export const AUTOMATIC_SURVEY_TRIGGERS: SurveyTrigger[] = [SurveyTrigger.OPPORTUNITY_WON]

export const PUBLISHED_TRIGGER_CONFLICT =
  'Ya existe una encuesta activa para el disparador Oportunidad ganada. Desactívala antes de activar otra.'

export const WON_WITHOUT_ACTIVE_SURVEY =
  'La oportunidad se marcó como ganada. No hay una encuesta activa para este disparador.'

export const ACTIVE_INVITATION_EXISTS = 'Ya existe una invitación vigente para esta oportunidad.'
export const RESPONDED_INVITATION = 'La encuesta ya fue respondida'
export const REGENERATE_CONFIRMATION_REQUIRED =
  'Confirma la regeneración del enlace. El enlace anterior dejará de funcionar.'

export type InvitationCardStatus =
  | 'UNCONFIGURED'
  | 'NOT_GENERATED'
  | 'PENDING'
  | 'RESPONDED'
  | 'EXPIRED'
  | 'REVOKED'

export function isAutomaticSurveyTrigger(trigger: SurveyTrigger) {
  return AUTOMATIC_SURVEY_TRIGGERS.includes(trigger)
}

export function shouldInviteOnWon(previous: OpportunityStage, next: OpportunityStage) {
  return previous !== OpportunityStage.WON && next === OpportunityStage.WON
}

export function invitationCardStatus(input: {
  hasPublishedAutomaticSurvey: boolean
  invitation?: {
    usedAt?: Date | string | null
    expiresAt: Date | string
    revokedAt?: Date | string | null
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

export function canRegenerateInvitation(status: InvitationCardStatus) {
  return status === 'EXPIRED' || status === 'REVOKED' || status === 'PENDING'
}

export function buildPublicSurveyUrl(frontendUrl: string, rawToken: string) {
  const origin = frontendUrl.replace(/\/$/, '')
  return `${origin}/public/surveys/${rawToken}`
}

export function serializeInvitationCard(
  status: InvitationCardStatus,
  invitation?: {
    surveyId: string
    surveyTitle: string
    trigger: SurveyTrigger
    createdAt: Date | string
    expiresAt: Date | string
    usedAt?: Date | string | null
  } | null,
) {
  return {
    status,
    surveyId: invitation?.surveyId ?? null,
    surveyTitle: invitation?.surveyTitle ?? null,
    trigger: invitation?.trigger ?? null,
    createdAt: invitation ? new Date(invitation.createdAt).toISOString() : null,
    expiresAt: invitation ? new Date(invitation.expiresAt).toISOString() : null,
    usedAt: invitation?.usedAt ? new Date(invitation.usedAt).toISOString() : null,
  }
}

export function hasPublishedTriggerConflict(existingId?: string | null, currentId?: string) {
  return Boolean(existingId && existingId !== currentId)
}
