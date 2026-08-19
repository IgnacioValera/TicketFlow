import { describe, expect, it } from 'vitest'
import {
  assertMutableTicket,
  validateAssign,
  validateAttachmentFile,
  validateClose,
  validateStatusChange,
} from '@/mocks/mock-ticket-guards'
import type { Ticket } from '@/types/ticket.types'
import type { User } from '@/types/user.types'

function ticket(partial: Partial<Ticket> & Pick<Ticket, 'id' | 'status'>): Ticket {
  return {
    folio: 'HD-2026-0001',
    title: 'Ticket de prueba',
    description: 'Descripción',
    categoryId: '1',
    categoryName: 'Hardware',
    priorityId: '2',
    priorityName: 'Media',
    requesterId: '4',
    requesterName: 'Solicitante',
    assigneeId: '2',
    assigneeName: 'Agente',
    slaDueAt: new Date(Date.now() + 3600000).toISOString(),
    slaCreatedAt: new Date().toISOString(),
    resolutionHours: 48,
    createdAt: new Date().toISOString(),
    ...partial,
  }
}

const agent: User = {
  id: '2',
  email: 'agent@helpdesk.com',
  fullName: 'Agente Soporte',
  role: 'AGENT',
  permissions: ['TICKET_STATUS_CHANGE', 'TICKET_VIEW_OWN'],
  status: 'ACTIVE',
}

const supervisor: User = {
  id: '3',
  email: 'supervisor@helpdesk.com',
  fullName: 'Supervisor Mesa',
  role: 'SUPERVISOR',
  permissions: ['TICKET_ASSIGN', 'TICKET_STATUS_CHANGE', 'TICKET_VIEW_ALL'],
  status: 'ACTIVE',
}

describe('mock-ticket-guards', () => {
  it('bloquea mutaciones en tickets finalizados', () => {
    expect(assertMutableTicket(ticket({ id: '1', status: 'CLOSED' }))?.status).toBe(409)
    expect(assertMutableTicket(ticket({ id: '2', status: 'CANCELLED' }))?.status).toBe(409)
  })

  it('rechaza transiciones inválidas con 422', () => {
    const result = validateStatusChange(ticket({ id: '1', status: 'OPEN' }), supervisor, 'RESOLVED')
    expect(result?.status).toBe(422)
  })

  it('exige motivo al resolver', () => {
    const result = validateStatusChange(
      ticket({ id: '1', status: 'IN_PROGRESS' }),
      agent,
      'RESOLVED',
    )
    expect(result?.status).toBe(400)
  })

  it('permite reapertura de cerrado con motivo', () => {
    const result = validateStatusChange(
      ticket({ id: '1', status: 'CLOSED', requesterId: '4' }),
      supervisor,
      'IN_PROGRESS',
      'La falla volvió a presentarse',
    )
    expect(result).toBeNull()
  })

  it('no permite reabrir cancelado', () => {
    const result = validateStatusChange(
      ticket({ id: '1', status: 'CANCELLED' }),
      supervisor,
      'IN_PROGRESS',
      'Intento de reapertura',
    )
    expect(result?.status).toBe(422)
  })

  it('valida asignación sólo para supervisor/admin', () => {
    expect(validateAssign(agent, ticket({ id: '1', status: 'OPEN' }))?.status).toBe(403)
    expect(validateAssign(supervisor, ticket({ id: '1', status: 'OPEN' }))).toBeNull()
  })

  it('valida cierre sólo desde resuelto', () => {
    expect(validateClose(supervisor, ticket({ id: '1', status: 'IN_PROGRESS' }))?.status).toBe(422)
    expect(validateClose(supervisor, ticket({ id: '1', status: 'RESOLVED' }))).toBeNull()
  })

  it('rechaza adjuntos mayores a 5 MB', () => {
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.pdf', {
      type: 'application/pdf',
    })
    expect(validateAttachmentFile(oversized)?.status).toBe(413)
  })
})
