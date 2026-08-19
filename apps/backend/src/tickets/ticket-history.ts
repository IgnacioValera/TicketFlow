export function sortTicketHistories<T extends { id: string; createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const time = a.createdAt.getTime() - b.createdAt.getTime()
    if (time !== 0) return time
    return a.id.localeCompare(b.id)
  })
}

export function serializeHistoryRecord(
  history: {
    id: string
    eventType: string
    oldStatus: string | null
    newStatus: string
    changedBy: { id: string; fullName: string }
    reason: string | null
    details: Record<string, unknown> | null
    createdAt: Date
  },
  ticketId: string,
) {
  return {
    id: history.id,
    ticketId,
    eventType: history.eventType,
    oldStatus: history.oldStatus,
    newStatus: history.newStatus,
    changedBy: history.changedBy.id,
    changedByName: history.changedBy.fullName,
    reason: history.reason ?? undefined,
    details: history.details ?? null,
    createdAt: history.createdAt.toISOString(),
  }
}
