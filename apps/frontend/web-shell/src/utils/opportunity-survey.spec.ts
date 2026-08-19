import { describe, expect, it } from 'vitest'
import {
  canRegenerateInvitation,
  canRetryAutomaticInvitation,
  invitationCardStatus,
  invitationCopyWarning,
  invitationRequestSurveyId,
  INVITATION_STATUS_LABELS,
} from '@/utils/opportunity-survey'

describe('Encuesta de oportunidad', () => {
  it('no permite regenerar una invitación respondida o vigente', () => {
    expect(canRegenerateInvitation('EXPIRED')).toBe(true)
    expect(canRegenerateInvitation('REVOKED')).toBe(true)
    expect(canRegenerateInvitation('RESPONDED')).toBe(false)
    expect(canRegenerateInvitation('PENDING')).toBe(false)
    expect(INVITATION_STATUS_LABELS.PENDING).toBe('Pendiente de respuesta')
    expect(INVITATION_STATUS_LABELS.EXPIRED).toBe('Enlace expirado')
  })

  it('calcula el estado de la tarjeta sin exponer el enlace', () => {
    expect(invitationCardStatus({ hasPublishedAutomaticSurvey: false, invitation: null })).toBe('UNCONFIGURED')
    expect(invitationCardStatus({ hasPublishedAutomaticSurvey: true, invitation: null })).toBe('NOT_GENERATED')
    expect(
      invitationCardStatus({
        hasPublishedAutomaticSurvey: true,
        invitation: { expiresAt: '2099-01-01T00:00:00.000Z', usedAt: null },
      }),
    ).toBe('PENDING')
    expect(
      invitationCardStatus({
        hasPublishedAutomaticSurvey: true,
        invitation: { expiresAt: '2020-01-01T00:00:00.000Z', usedAt: null },
        now: new Date('2026-08-20T00:00:00.000Z'),
      }),
    ).toBe('EXPIRED')
  })

  it('advierte al cerrar el modal si el enlace no se copió', () => {
    expect(invitationCopyWarning(false)).toContain('no volverá a mostrarse')
    expect(invitationCopyWarning(true)).toBeNull()
  })

  it('no pide la encuesta automática hasta Ganada y permite una manual en cualquier etapa', () => {
    expect(canRetryAutomaticInvitation('NEW', 'NOT_GENERATED')).toBe(false)
    expect(canRetryAutomaticInvitation('WON', 'NOT_GENERATED')).toBe(true)
    expect(invitationRequestSurveyId({ selectedManualId: 's-nps', stage: 'NEW', cardSurveyId: 's-auto' })).toBe('s-nps')
    expect(invitationRequestSurveyId({ selectedManualId: '', stage: 'NEW', cardSurveyId: 's-auto' })).toBeUndefined()
    expect(invitationRequestSurveyId({ selectedManualId: '', stage: 'WON', cardSurveyId: 's-auto' })).toBe('s-auto')
    expect(invitationRequestSurveyId({ selectedManualId: '', stage: 'NEW', cardSurveyId: 's-nps', confirmRegenerate: true })).toBe('s-nps')
  })
})
