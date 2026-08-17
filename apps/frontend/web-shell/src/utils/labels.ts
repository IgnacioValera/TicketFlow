import type {
  ActivityStatus,
  ActivityType,
  ClientSegment,
  ClientStatus,
  ClientTier,
  OpportunityStage,
  SurveyQuestionType,
  SurveyStatus,
  SurveyTrigger,
} from '@/types/crm.types'

function pick<T extends string>(map: Record<T, string>, value: T | string) {
  return map[value as T] ?? value
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: 'Llamada',
  MEETING: 'Reunión',
  TASK: 'Tarea',
  NOTE: 'Nota',
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  NEW: 'Nueva',
  QUALIFICATION: 'Calificación',
  PROPOSAL: 'Propuesta',
  NEGOTIATION: 'Negociación',
  WON: 'Ganada',
  LOST: 'Perdida',
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  PROSPECT: 'Prospecto',
}

export const CLIENT_SEGMENT_LABELS: Record<ClientSegment, string> = {
  ENTERPRISE: 'Corporativo',
  MID_MARKET: 'Mediana empresa',
  SMB: 'PyME',
}

export const CLIENT_TIER_LABELS: Record<ClientTier, string> = {
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
  PLATINUM: 'Platino',
}

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  CLOSED: 'Cerrada',
}

export const SURVEY_TRIGGER_LABELS: Record<SurveyTrigger, string> = {
  MANUAL: 'Manual',
  OPPORTUNITY_WON: 'Al ganar oportunidad',
}

export const SURVEY_QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  TEXT: 'Texto',
  SINGLE_CHOICE: 'Opción única',
  MULTIPLE_CHOICE: 'Opción múltiple',
  NPS: 'NPS',
  RATING: 'Escala',
  YES_NO: 'Sí / No',
}

export const TIMELINE_TYPE_LABELS: Record<string, string> = {
  activity: 'Actividad',
  stage: 'Etapa',
  ticket: 'Ticket',
}

export function getActivityTypeLabel(value: ActivityType | string) {
  return pick(ACTIVITY_TYPE_LABELS, value)
}

export function getActivityStatusLabel(value: ActivityStatus | string) {
  return pick(ACTIVITY_STATUS_LABELS, value)
}

export function getOpportunityStageLabel(value: OpportunityStage | string) {
  return pick(OPPORTUNITY_STAGE_LABELS, value)
}

export function getClientStatusLabel(value: ClientStatus | string) {
  return pick(CLIENT_STATUS_LABELS, value)
}

export function getClientSegmentLabel(value: ClientSegment | string) {
  return pick(CLIENT_SEGMENT_LABELS, value)
}

export function getClientTierLabel(value: ClientTier | string) {
  return pick(CLIENT_TIER_LABELS, value)
}

export function getSurveyStatusLabel(value: SurveyStatus | string) {
  return pick(SURVEY_STATUS_LABELS, value)
}

export function getSurveyTriggerLabel(value: SurveyTrigger | string) {
  return pick(SURVEY_TRIGGER_LABELS, value)
}

export function getSurveyQuestionTypeLabel(value: SurveyQuestionType | string) {
  return pick(SURVEY_QUESTION_TYPE_LABELS, value)
}

export function getTimelineTypeLabel(value: string) {
  return TIMELINE_TYPE_LABELS[value] ?? value
}

export function formatMoney(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date)
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
