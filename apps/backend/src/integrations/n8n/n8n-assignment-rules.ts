import { TicketStatus } from '../../database/entities'

export const AI_SYSTEM_ACTOR_NAME = 'Agente de IA'
export const N8N_SOURCE = 'N8N_AI'
export const N8N_WEBHOOK_TIMEOUT_MS = 2000
export const N8N_INTEGRATION_HEADER = 'x-ticketflow-integration-key'
export const N8N_WEBHOOK_SECRET_HEADER = 'x-ticketflow-webhook-secret'

export const ACTIVE_WORKLOAD_STATUSES: TicketStatus[] = [
  TicketStatus.ASSIGNED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_USER,
  TicketStatus.ESCALATED,
]

export interface AgentWorkload {
  totalActive: number
  assigned: number
  inProgress: number
  waitingUser: number
  escalated: number
}

export function emptyWorkload(): AgentWorkload {
  return { totalActive: 0, assigned: 0, inProgress: 0, waitingUser: 0, escalated: 0 }
}

export function applyWorkloadStatus(workload: AgentWorkload, status: TicketStatus): AgentWorkload {
  const next = { ...workload }
  if (status === TicketStatus.ASSIGNED) next.assigned += 1
  else if (status === TicketStatus.IN_PROGRESS) next.inProgress += 1
  else if (status === TicketStatus.WAITING_USER) next.waitingUser += 1
  else if (status === TicketStatus.ESCALATED) next.escalated += 1
  else return next
  next.totalActive = next.assigned + next.inProgress + next.waitingUser + next.escalated
  return next
}

export function isActiveWorkloadStatus(status: TicketStatus) {
  return ACTIVE_WORKLOAD_STATUSES.includes(status)
}

export type AssignmentBlockReason = 'ALREADY_ASSIGNED' | 'NOT_ELIGIBLE'

export function assignmentContextState(ticket: { assigneeId?: string | null; status: TicketStatus }): {
  processable: boolean
  reason: AssignmentBlockReason | null
} {
  if (ticket.assigneeId) return { processable: false, reason: 'ALREADY_ASSIGNED' }
  if (ticket.status !== TicketStatus.OPEN) return { processable: false, reason: 'NOT_ELIGIBLE' }
  return { processable: true, reason: null }
}

export function enqueueTicketCreatedWebhook(
  notify: (ticketId: string) => Promise<void>,
  ticketId: string,
  onError: (error: unknown) => void,
) {
  void notify(ticketId).catch(onError)
}
