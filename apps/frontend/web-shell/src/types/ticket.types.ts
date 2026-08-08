import type { PaginationParams } from '@/types/api.types'

export type TicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_USER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

export type SlaLevel = 'green' | 'yellow' | 'orange' | 'red'

export interface TicketComment {
  id: string
  ticketId: string
  userId: string
  authorName: string
  body: string
  isInternal: boolean
  createdAt: string
}

export interface TicketAttachment {
  id: string
  ticketId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  fileUrl: string
  uploadedBy: string
  uploadedByName: string
  createdAt: string
}

export interface TicketStatusHistory {
  id: string
  ticketId: string
  oldStatus: TicketStatus | null
  newStatus: TicketStatus
  changedBy: string
  changedByName: string
  reason?: string
  createdAt: string
}

export interface TicketSurvey {
  id: string
  ticketId: string
  rating: number
  comment?: string
  submittedAt: string
}

export interface TicketSlaStatus {
  level: SlaLevel
  percentRemaining: number
  dueAt: string
  createdAt: string
  resolutionHours: number
}

export interface Ticket {
  id: string
  folio: string
  title: string
  description: string
  status: TicketStatus
  categoryId: string
  categoryName: string
  priorityId: string
  priorityName: string
  priorityColor?: string
  requesterId: string
  requesterName: string
  assigneeId?: string | null
  assigneeName?: string | null
  companyId?: string | null
  companyName?: string | null
  slaDueAt: string
  slaCreatedAt: string
  resolutionHours: number
  closedAt?: string | null
  createdAt: string
  statusHistory?: TicketStatusHistory[]
  comments?: TicketComment[]
  attachments?: TicketAttachment[]
  survey?: TicketSurvey | null
}

export interface CreateTicketPayload {
  title: string
  description: string
  categoryId: string
  priorityId: string
  companyId?: string
}

export interface UpdateTicketPayload {
  title?: string
  description?: string
  categoryId?: string
  priorityId?: string
}

export interface ChangeTicketStatusPayload {
  status: TicketStatus
  reason?: string
}

export interface AssignTicketPayload {
  assigneeId: string
}

export interface EscalateTicketPayload {
  reason: string
}

export interface CreateCommentPayload {
  body: string
  isInternal?: boolean
}

export interface SubmitSurveyPayload {
  rating: number
  comment?: string
}

export type SlaFilterStatus = 'overdue' | 'warning' | 'on_time'

export interface TicketsListParams extends PaginationParams {
  status?: TicketStatus
  priorityId?: string
  categoryId?: string
  assigneeId?: string
  search?: string
  unassigned?: boolean
  mine?: boolean
  slaStatus?: SlaFilterStatus
}
