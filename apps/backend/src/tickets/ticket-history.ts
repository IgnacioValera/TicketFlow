export function sortTicketHistories<T extends { id: string; createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const time = a.createdAt.getTime() - b.createdAt.getTime()
    if (time !== 0) return time
    return a.id.localeCompare(b.id)
  })
}

export const SYSTEM_ACTOR_NAME = 'Agente de IA'

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
    details: history.details ?? null,
    createdAt: history.createdAt.toISOString(),
  }
}
