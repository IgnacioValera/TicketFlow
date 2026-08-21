export function sortTicketHistories<T extends { id: string; createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const time = a.createdAt.getTime() - b.createdAt.getTime()
    if (time !== 0) return time
    return a.id.localeCompare(b.id)
  })
}

export const SYSTEM_ACTOR_NAME = 'Agente de IA'

export function publicHistoryDetails(details: Record<string, unknown> | null) {
  if (!details) return null
  const out: Record<string, unknown> = {}
  if ('from' in details && (typeof details.from === 'string' || details.from === null)) {
    out.from = details.from
  }
  if (typeof details.to === 'string' && details.to.trim()) out.to = details.to
  if (typeof details.assigneeName === 'string' && details.assigneeName.trim()) {
    out.assigneeName = details.assigneeName
  }
  if (details.assignmentKind === 'AUTOMATIC' || details.assignmentKind === 'MANUAL') {
    out.assignmentKind = details.assignmentKind
  }
  if (Array.isArray(details.factors)) {
    const factors = details.factors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    if (factors.length) out.factors = factors
  }
  return Object.keys(out).length ? out : null
}

export function serializeHistoryRecord(
  history: {
    id: string
    eventType: string
    oldStatus: string | null
    newStatus: string
    actorType?: string | null
    actorName?: string | null
    changedBy: { id: string; fullName: string } | null
    reason: string | null
    details: Record<string, unknown> | null
    createdAt: Date
  },
  ticketId: string,
) {
  const actorType = history.actorType || (history.changedBy ? 'USER' : 'SYSTEM')
  const changedByName = history.actorName || history.changedBy?.fullName || (actorType === 'SYSTEM' ? SYSTEM_ACTOR_NAME : '')
  return {
    id: history.id,
    ticketId,
    eventType: history.eventType,
    oldStatus: history.oldStatus,
    newStatus: history.newStatus,
    actorType,
    changedBy: history.changedBy?.id ?? null,
    changedByName,
    reason: history.reason ?? undefined,
    details: publicHistoryDetails(history.details),
    createdAt: history.createdAt.toISOString(),
  }
}
