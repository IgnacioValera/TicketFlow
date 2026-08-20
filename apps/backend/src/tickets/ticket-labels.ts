import { TicketStatus } from '../database/entities'

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Abierto',
  [TicketStatus.ASSIGNED]: 'Asignado',
  [TicketStatus.IN_PROGRESS]: 'En proceso',
  [TicketStatus.WAITING_USER]: 'En espera',
  [TicketStatus.ESCALATED]: 'Escalado',
  [TicketStatus.RESOLVED]: 'Resuelto',
  [TicketStatus.CLOSED]: 'Cerrado',
  [TicketStatus.CANCELLED]: 'Cancelado',
}
