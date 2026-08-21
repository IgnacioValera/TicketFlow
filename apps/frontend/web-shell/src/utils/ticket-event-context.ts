import type { TicketStatus, TicketStatusHistory } from '@/types/ticket.types'

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Creación del ticket',
  ASSIGNED: 'Asignación del ticket',
  AI_ASSIGNED: 'Asignación realizada por IA',
  AI_ASSIGNMENT_FAILED: 'Asignación automática no aplicada',
  REASSIGNED: 'Reasignación del ticket',
  STATUS_CHANGED: 'Cambio de estado',
  PRIORITY_CHANGED: 'Cambio de prioridad',
  UPDATED: 'Actualización del ticket',
}

function inferContextEventType(item: HistoryLike) {
  if (item.eventType) return item.eventType
  if (!item.oldStatus && item.newStatus === 'OPEN') return 'CREATED'
  if (item.oldStatus !== item.newStatus) {
    if (item.newStatus === 'ASSIGNED') return 'ASSIGNED'
    return 'STATUS_CHANGED'
  }
  return 'UPDATED'
}

function actionLabelFor(type: string) {
  return ACTION_LABELS[type] ?? 'Evento del sistema'
}

export const GENERIC_ASSIGNMENT_REASON = 'Asignación de responsable'

export type EventContextVariant =
  | 'resolve'
  | 'close'
  | 'escalate'
  | 'reopen'
  | 'waiting'
  | 'cancel'
  | 'status'
  | 'ai'
  | 'manual'

export type EventContextModel = {
  show: boolean
  showPreview: boolean
  title: string
  body: string
  variant: EventContextVariant
  actorName: string | null
  occurredAt: string | null
  actionLabel: string
  assigneeName: string | null
  automatic: boolean
  factors: string[]
}

export type ReasonCaptureCopy = {
  title: string
  label: string
  placeholder: string
  helper: string
}

type HistoryLike = Pick<TicketStatusHistory, 'oldStatus' | 'newStatus' | 'createdAt'> & {
  eventType?: string | null
  reason?: string | null
  details?: Record<string, unknown> | null
  changedByName?: string | null
  actorType?: 'USER' | 'SYSTEM' | null
}

export function isUserWrittenReason(reason?: string | null) {
  const trimmed = reason?.trim() ?? ''
  if (!trimmed) return false
  return trimmed !== GENERIC_ASSIGNMENT_REASON
}

export function assignmentAgentName(details?: Record<string, unknown> | null) {
  if (!details) return null
  if (typeof details.assigneeName === 'string' && details.assigneeName.trim()) return details.assigneeName.trim()
  if (typeof details.to === 'string' && details.to.trim()) return details.to.trim()
  return null
}

export function assignmentFactors(details?: Record<string, unknown> | null) {
  if (!Array.isArray(details?.factors)) return []
  return details.factors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function isAutomaticAssignment(item: HistoryLike) {
  const type = inferContextEventType(item)
  if (type === 'AI_ASSIGNED' || type === 'AI_ASSIGNMENT_FAILED') return true
  return item.details?.assignmentKind === 'AUTOMATIC' || item.actorType === 'SYSTEM'
}

export function eventContextTitle(item: HistoryLike) {
  const type = inferContextEventType(item)
  if (type === 'AI_ASSIGNED') return 'Asignación realizada por IA'
  if (type === 'AI_ASSIGNMENT_FAILED') return 'Asignación automática no aplicada'
  if (type === 'ASSIGNED' || type === 'REASSIGNED') return 'Asignación manual'
  if (item.newStatus === 'RESOLVED') return 'Motivo de la resolución'
  if (item.newStatus === 'CLOSED') return 'Motivo del cierre'
  if (item.newStatus === 'ESCALATED') return 'Motivo del escalamiento'
  if (item.newStatus === 'WAITING_USER') return 'Motivo de la espera'
  if (item.newStatus === 'CANCELLED') return 'Motivo de la cancelación'
  if (
    item.newStatus === 'IN_PROGRESS' &&
    (item.oldStatus === 'CLOSED' || item.oldStatus === 'RESOLVED')
  ) {
    return 'Motivo de la reapertura'
  }
  return 'Motivo del cambio'
}

export function eventContextVariant(item: HistoryLike): EventContextVariant {
  const type = inferContextEventType(item)
  if (type === 'AI_ASSIGNED' || type === 'AI_ASSIGNMENT_FAILED') return 'ai'
  if (type === 'ASSIGNED' || type === 'REASSIGNED') return 'manual'
  if (item.newStatus === 'RESOLVED' || item.newStatus === 'CLOSED') return item.newStatus === 'CLOSED' ? 'close' : 'resolve'
  if (item.newStatus === 'ESCALATED') return 'escalate'
  if (item.newStatus === 'WAITING_USER') return 'waiting'
  if (item.newStatus === 'CANCELLED') return 'cancel'
  if (item.newStatus === 'IN_PROGRESS' && (item.oldStatus === 'CLOSED' || item.oldStatus === 'RESOLVED')) {
    return 'reopen'
  }
  return 'status'
}

export function buildEventContext(item: HistoryLike): EventContextModel {
  const type = inferContextEventType(item)
  const automatic = isAutomaticAssignment(item)
  const assigneeName = assignmentAgentName(item.details)
  const factors = assignmentFactors(item.details)
  const written = isUserWrittenReason(item.reason)
  const assignmentEvent = type === 'ASSIGNED' || type === 'REASSIGNED' || type === 'AI_ASSIGNED' || type === 'AI_ASSIGNMENT_FAILED'
  const show = Boolean(written || assignmentEvent)
  const body = written
    ? (item.reason ?? '').trim()
    : assignmentEvent && assigneeName
      ? `Se asignó a ${assigneeName}.`
      : ''
  const showPreview = written

  return {
    show,
    showPreview,
    title: eventContextTitle(item),
    body,
    variant: eventContextVariant(item),
    actorName: item.changedByName?.trim() || (automatic ? 'Agente de IA' : null),
    occurredAt: item.createdAt,
    actionLabel: actionLabelFor(type),
    assigneeName,
    automatic,
    factors,
  }
}

export function reasonCaptureCopy(from: TicketStatus, to: TicketStatus, kind: 'status' | 'escalate'): ReasonCaptureCopy {
  if (kind === 'escalate' || to === 'ESCALATED') {
    return {
      title: 'Escalar ticket',
      label: 'Motivo del escalamiento',
      placeholder: 'Describe por qué este ticket debe escalarse',
      helper: 'Este motivo aparecerá en el historial y en el flujo del ticket.',
    }
  }
  if (to === 'RESOLVED') {
    return {
      title: 'Resolver ticket',
      label: 'Motivo de la resolución',
      placeholder: 'Describe cómo se resolvió el ticket',
      helper: 'Este motivo aparecerá en el historial y en el flujo del ticket.',
    }
  }
  if (to === 'WAITING_USER') {
    return {
      title: 'Poner en espera',
      label: 'Motivo de la espera',
      placeholder: 'Indica qué información se espera del usuario',
      helper: 'Este motivo aparecerá en el historial y en el flujo del ticket.',
    }
  }
  if (to === 'CANCELLED') {
    return {
      title: 'Cancelar ticket',
      label: 'Motivo de la cancelación',
      placeholder: 'Explica por qué se cancela este ticket',
      helper: 'Este motivo aparecerá en el historial y en el flujo del ticket.',
    }
  }
  if (from === 'CLOSED' && to === 'IN_PROGRESS') {
    return {
      title: 'Reabrir ticket',
      label: 'Motivo de la reapertura',
      placeholder: 'Explica por qué se reabre este ticket',
      helper: 'Este motivo aparecerá en el historial y en el flujo del ticket.',
    }
  }
  if (from === 'RESOLVED' && to === 'IN_PROGRESS') {
    return {
      title: 'Reabrir ticket',
      label: 'Motivo de la reapertura',
      placeholder: 'Explica por qué se retoma la atención',
      helper: 'Este motivo aparecerá en el historial y en el flujo del ticket.',
    }
  }
  return {
    title: 'Motivo del cambio',
    label: 'Motivo del cambio',
    placeholder: 'Describe el motivo de este cambio',
    helper: 'Este motivo aparecerá en el historial y en el flujo del ticket.',
  }
}
