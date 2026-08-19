import { OpportunityStage, SurveyTrigger } from '../database/entities'
import {
  ACTIVE_INVITATION_EXISTS,
  buildPublicSurveyUrl,
  canRegenerateInvitation,
  hasPublishedTriggerConflict,
  invitationCardStatus,
  isAutomaticSurveyTrigger,
  PUBLISHED_TRIGGER_CONFLICT,
  serializeInvitationCard,
  shouldInviteOnWon,
  WON_WITHOUT_ACTIVE_SURVEY,
} from './survey-invitation'
import { createSurveyToken, hashSurveyToken } from './survey-token'

describe('Automatización de encuestas CRM', () => {
  it('solo dispara al entrar a Ganada', () => {
    expect(shouldInviteOnWon(OpportunityStage.NEGOTIATION, OpportunityStage.WON)).toBe(true)
    expect(shouldInviteOnWon(OpportunityStage.WON, OpportunityStage.WON)).toBe(false)
    expect(shouldInviteOnWon(OpportunityStage.NEW, OpportunityStage.QUALIFICATION)).toBe(false)
    expect(shouldInviteOnWon(OpportunityStage.NEGOTIATION, OpportunityStage.LOST)).toBe(false)
    expect(shouldInviteOnWon(OpportunityStage.WON, OpportunityStage.NEGOTIATION)).toBe(false)
  })

  it('distingue disparadores automáticos de manuales', () => {
    expect(isAutomaticSurveyTrigger(SurveyTrigger.OPPORTUNITY_WON)).toBe(true)
    expect(isAutomaticSurveyTrigger(SurveyTrigger.MANUAL)).toBe(false)
    expect(PUBLISHED_TRIGGER_CONFLICT).toContain('Oportunidad ganada')
    expect(hasPublishedTriggerConflict('s1', 's2')).toBe(true)
    expect(hasPublishedTriggerConflict('s1', 's1')).toBe(false)
  })

  it('calcula el estado de la tarjeta sin exponer el token', () => {
    expect(invitationCardStatus({ hasPublishedAutomaticSurvey: false, invitation: null })).toBe('UNCONFIGURED')
    expect(invitationCardStatus({ hasPublishedAutomaticSurvey: true, invitation: null })).toBe('NOT_GENERATED')
    expect(
      invitationCardStatus({
        hasPublishedAutomaticSurvey: true,
        invitation: { expiresAt: '2099-01-01T00:00:00.000Z', usedAt: null, revokedAt: null },
      }),
    ).toBe('PENDING')
    expect(
      invitationCardStatus({
        hasPublishedAutomaticSurvey: true,
        invitation: { expiresAt: '2099-01-01T00:00:00.000Z', usedAt: '2026-08-20T00:00:00.000Z' },
      }),
    ).toBe('RESPONDED')
    expect(
      invitationCardStatus({
        hasPublishedAutomaticSurvey: true,
        invitation: { expiresAt: '2020-01-01T00:00:00.000Z', usedAt: null },
        now: new Date('2026-08-20T00:00:00.000Z'),
      }),
    ).toBe('EXPIRED')
    expect(
      invitationCardStatus({
        hasPublishedAutomaticSurvey: true,
        invitation: { expiresAt: '2099-01-01T00:00:00.000Z', usedAt: null, revokedAt: '2026-08-19T00:00:00.000Z' },
      }),
    ).toBe('REVOKED')
    expect(canRegenerateInvitation('EXPIRED')).toBe(true)
    expect(canRegenerateInvitation('RESPONDED')).toBe(false)
    expect(canRegenerateInvitation('PENDING')).toBe(false)
  })

  it('guarda hash y no el token en claro', () => {
    const token = createSurveyToken()
    expect(token.hash).toBe(hashSurveyToken(token.raw))
    expect(token.hash).not.toBe(token.raw)
    expect(token.raw).not.toMatch(/demo-active-token/)
    expect(buildPublicSurveyUrl('https://ticketflow.example', token.raw)).toBe(
      `https://ticketflow.example/public/surveys/${token.raw}`,
    )
    expect(buildPublicSurveyUrl('https://ticketflow.example/', 'abc')).not.toContain('localhost')
    expect(ACTIVE_INVITATION_EXISTS).toBeTruthy()
    expect(WON_WITHOUT_ACTIVE_SURVEY).toContain('No hay una encuesta activa')
  })

  it('serializa la tarjeta sin token ni URL pública', () => {
    const card = serializeInvitationCard('PENDING', {
      surveyId: 's1',
      surveyTitle: 'Satisfacción postventa',
      trigger: SurveyTrigger.OPPORTUNITY_WON,
      createdAt: '2026-08-19T00:00:00.000Z',
      expiresAt: '2026-08-26T00:00:00.000Z',
      usedAt: null,
    })
    expect(card.status).toBe('PENDING')
    expect(card).not.toHaveProperty('responseUrl')
    expect(card).not.toHaveProperty('token')
    expect(JSON.stringify(card)).not.toContain('/public/surveys/')
  })
})
