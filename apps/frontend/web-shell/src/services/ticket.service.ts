import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm, apiPut } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  AssignTicketPayload,
  ChangeTicketStatusPayload,
  CreateCommentPayload,
  CreateTicketPayload,
  EscalateTicketPayload,
  SubmitSurveyPayload,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketSlaStatus,
  TicketSurvey,
  TicketsListParams,
  UpdateTicketPayload,
} from '@/types/ticket.types'

export async function getTickets(params: TicketsListParams = {}) {
  const response = await apiGet<Ticket[]>('/tickets', params as Record<string, unknown>)
  return response as ApiResponse<Ticket[]>
}

export async function getTicketById(id: string): Promise<Ticket> {
  const response = await apiGet<Ticket>(`/tickets/${id}`)
  return response.data
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const response = await apiPost<Ticket>('/tickets', payload)
  return response.data
}

export async function updateTicket(id: string, payload: UpdateTicketPayload): Promise<Ticket> {
  const response = await apiPut<Ticket>(`/tickets/${id}`, payload)
  return response.data
}

export async function changeTicketStatus(
  id: string,
  payload: ChangeTicketStatusPayload,
): Promise<Ticket> {
  const response = await apiPatch<Ticket>(`/tickets/${id}/status`, payload)
  return response.data
}

export async function assignTicket(id: string, payload: AssignTicketPayload): Promise<Ticket> {
  const response = await apiPatch<Ticket>(`/tickets/${id}/assign`, payload)
  return response.data
}

export async function escalateTicket(id: string, payload: EscalateTicketPayload): Promise<Ticket> {
  const response = await apiPatch<Ticket>(`/tickets/${id}/escalate`, payload)
  return response.data
}

export async function closeTicket(id: string): Promise<Ticket> {
  const response = await apiPatch<Ticket>(`/tickets/${id}/close`)
  return response.data
}

export async function getComments(ticketId: string): Promise<TicketComment[]> {
  const response = await apiGet<TicketComment[]>(`/tickets/${ticketId}/comments`)
  return response.data
}

export async function addComment(
  ticketId: string,
  payload: CreateCommentPayload,
): Promise<TicketComment> {
  const response = await apiPost<TicketComment>(`/tickets/${ticketId}/comments`, payload)
  return response.data
}

export async function getAttachments(ticketId: string): Promise<TicketAttachment[]> {
  const response = await apiGet<TicketAttachment[]>(`/tickets/${ticketId}/attachments`)
  return response.data
}

export async function uploadAttachment(ticketId: string, file: File): Promise<TicketAttachment> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiPostForm<TicketAttachment>(`/tickets/${ticketId}/attachments`, formData)
  return response.data
}

export async function deleteAttachment(id: string): Promise<void> {
  await apiDelete<null>(`/attachments/${id}`)
}

export async function getTicketSla(ticketId: string): Promise<TicketSlaStatus> {
  const response = await apiGet<TicketSlaStatus>(`/tickets/${ticketId}/sla`)
  return response.data
}

export async function submitSurvey(
  ticketId: string,
  payload: SubmitSurveyPayload,
): Promise<TicketSurvey> {
  const response = await apiPost<TicketSurvey>(`/tickets/${ticketId}/survey`, payload)
  return response.data
}
