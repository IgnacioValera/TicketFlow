import { serializeHistoryRecord, sortTicketHistories } from './ticket-history'

describe('Historial de tickets', () => {
  it('ordena por fecha y usa el id como segundo criterio', () => {
    const sorted = sortTicketHistories([
      { id: 'b', createdAt: new Date('2026-08-18T12:00:00.000Z') },
      { id: 'a', createdAt: new Date('2026-08-18T12:00:00.000Z') },
      { id: 'c', createdAt: new Date('2026-08-18T11:00:00.000Z') },
    ])
    expect(sorted.map((item) => item.id)).toEqual(['c', 'a', 'b'])
  })

  it('serializa responsable, fecha, origen técnico y no inventa datos', () => {
    const record = serializeHistoryRecord(
      {
        id: 'h1',
        eventType: 'ASSIGNED',
        oldStatus: 'OPEN',
        newStatus: 'ASSIGNED',
        changedBy: { id: 'u2', fullName: 'Agente Soporte' },
        reason: 'Asignación de responsable',
        details: { to: 'Agente Soporte' },
        createdAt: new Date('2026-08-18T14:35:00.000Z'),
      },
      'ticket-1',
    )
    expect(record.ticketId).toBe('ticket-1')
    expect(record.changedByName).toBe('Agente Soporte')
    expect(record.eventType).toBe('ASSIGNED')
    expect(record.createdAt).toBe('2026-08-18T14:35:00.000Z')
    expect(record.reason).toBe('Asignación de responsable')
    expect(JSON.stringify(record)).not.toMatch(/Ã|Â|â|�/)
  })
})
