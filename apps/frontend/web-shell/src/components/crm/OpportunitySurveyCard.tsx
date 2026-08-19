import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton, SelectInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import type { CrmSurvey, OpportunityStage } from '@/types/crm.types'
import type { SurveyInvitationCard } from '@/utils/opportunity-survey'
import {
  canRegenerateInvitation,
  canRetryAutomaticInvitation,
  INVITATION_STATUS_LABELS,
} from '@/utils/opportunity-survey'
import { formatDate } from '@/utils/labels'

interface OpportunitySurveyCardProps {
  card: SurveyInvitationCard | null | undefined
  stage: OpportunityStage
  manualSurveys: CrmSurvey[]
  selectedManualId: string
  onManualChange: (surveyId: string) => void
  generating: boolean
  onGenerate: (confirmRegenerate?: boolean) => void
}

export function OpportunitySurveyCard({
  card,
  stage,
  manualSurveys,
  selectedManualId,
  onManualChange,
  generating,
  onGenerate,
}: OpportunitySurveyCardProps) {
  const { hasPermission } = usePermissions()
  const canGenerate = hasPermission(PERMISSIONS.CRM_OPPORTUNITY_MOVE)
  const canResults = hasPermission(PERMISSIONS.CRM_SURVEY_RESULTS)
  const status = card?.status ?? 'UNCONFIGURED'
  const retryAutomatic = canGenerate && canRetryAutomaticInvitation(stage, status)
  const showManual = canGenerate

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-brand-navy">Encuesta de satisfacción</h3>
      {status === 'UNCONFIGURED' ? (
        <p className="mt-2 text-sm text-slate-600">
          No hay una encuesta activa de Oportunidad ganada. Esa se envía sola al marcar la oportunidad como Ganada.
        </p>
      ) : null}
      {status === 'NOT_GENERATED' && stage !== 'WON' ? (
        <p className="mt-2 text-sm text-slate-600">
          Al marcar esta oportunidad como Ganada se enviará “{card?.surveyTitle ?? 'la encuesta de postventa'}”.
        </p>
      ) : null}
      {status === 'NOT_GENERATED' && stage === 'WON' ? (
        <p className="mt-2 text-sm text-slate-600">No se ha generado una invitación para esta oportunidad.</p>
      ) : null}
      {status === 'PENDING' && card ? (
        <dl className="mt-2 space-y-1 text-sm">
          <div>Encuesta: {card.surveyTitle}</div>
          <div>Estado: {INVITATION_STATUS_LABELS.PENDING}</div>
          <div>Generada: {formatDate(card.createdAt)}</div>
          <div>Vence: {formatDate(card.expiresAt)}</div>
        </dl>
      ) : null}
      {status === 'RESPONDED' && card ? (
        <dl className="mt-2 space-y-1 text-sm">
          <div>Encuesta: {card.surveyTitle}</div>
          <div>Estado: {INVITATION_STATUS_LABELS.RESPONDED}</div>
          <div>Respondida: {formatDate(card.usedAt)}</div>
        </dl>
      ) : null}
      {status === 'EXPIRED' ? (
        <p className="mt-2 text-sm text-slate-600">Estado: {INVITATION_STATUS_LABELS.EXPIRED}</p>
      ) : null}
      {status === 'REVOKED' ? (
        <p className="mt-2 text-sm text-slate-600">Estado: {INVITATION_STATUS_LABELS.REVOKED}</p>
      ) : null}

      {retryAutomatic ? (
        <PrimaryButton className="mt-3" type="button" disabled={generating} onClick={() => onGenerate(false)}>
          {generating ? 'Generando…' : 'Generar encuesta'}
        </PrimaryButton>
      ) : null}

      {showManual ? (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-sm font-medium text-brand-navy">Enviar ahora (manual)</p>
          <p className="text-sm text-slate-600">
            Las encuestas con disparador Manual no esperan a Ganada: eliges una activa y generas el enlace.
          </p>
          {manualSurveys.length > 0 ? (
            <>
              <SelectInput
                aria-label="Encuesta manual"
                value={selectedManualId}
                onChange={(event) => onManualChange(event.target.value)}
              >
                <option value="">Seleccionar encuesta manual</option>
                {manualSurveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}
                  </option>
                ))}
              </SelectInput>
              {selectedManualId ? (
                <PrimaryButton type="button" disabled={generating} onClick={() => onGenerate(false)}>
                  {generating ? 'Generando…' : 'Generar encuesta manual'}
                </PrimaryButton>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Crea una encuesta con disparador Manual, agrégale preguntas y actívala para enviarla desde aquí.
            </p>
          )}
        </div>
      ) : null}

      {canGenerate && canRegenerateInvitation(status) ? (
        <SecondaryButton
          className="mt-3"
          type="button"
          disabled={generating}
          onClick={() => {
            if (!window.confirm('Se invalidará el enlace anterior. ¿Generar uno nuevo?')) return
            onGenerate(true)
          }}
        >
          Generar nuevo enlace
        </SecondaryButton>
      ) : null}

      {status === 'RESPONDED' && canResults && card?.surveyId ? (
        <Link to={`/crm/surveys/${card.surveyId}/results`} className="mt-3 inline-block text-sm font-medium text-brand-teal hover:underline">
          Ver resultados
        </Link>
      ) : null}
    </section>
  )
}
