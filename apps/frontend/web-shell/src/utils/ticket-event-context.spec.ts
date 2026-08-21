import { describe, expect, it } from 'vitest'
import {
  buildEventContext,
  GENERIC_ASSIGNMENT_REASON,
  isUserWrittenReason,
  reasonCaptureCopy,
} from '@/utils/ticket-event-context'

const base = {
  oldStatus: 'IN_PROGRESS' as const,
  newStatus: 'RESOLVED' as const,
  createdAt: '2026-08-21T12:00:00.000Z',
  changedByName: 'Agente Soporte',
  actorType: 'USER' as const,
}

describe('Contexto de eventos de ticket', () => {
  it('no trata la asignación genérica como motivo escrito', () => {
    expect(isUserWrittenReason(GENERIC_ASSIGNMENT_REASON)).toBe(false)
    expect(isUserWrittenReason('   ')).toBe(false)
    expect(isUserWrittenReason('El usuario confirmó la solución')).toBe(true)
  })

  it('arma la tarjeta de resolución con el motivo real', () => {
    const context = buildEventContext({
      ...base,
      eventType: 'STATUS_CHANGED',
      reason: 'Se restableció el acceso VPN',
    })
    expect(context.show).toBe(true)
    expect(context.showPreview).toBe(true)
    expect(context.title).toBe('Motivo de la resolución')
    expect(context.variant).toBe('resolve')
    expect(context.body).toBe('Se restableció el acceso VPN')
    expect(context.actionLabel).toBe('Cambio de estado')
  })

  it('distingue asignación automática de la manual', () => {
    const ai = buildEventContext({
      oldStatus: 'OPEN',
      newStatus: 'ASSIGNED',
      createdAt: '2026-08-21T12:00:00.000Z',
      eventType: 'AI_ASSIGNED',
      actorType: 'SYSTEM',
      changedByName: 'Agente de IA',
      reason: 'Tiene la menor carga de tickets activos.',
      details: { assigneeName: 'Ana López', assignmentKind: 'AUTOMATIC', factors: ['Carga de trabajo'] },
    })
    expect(ai.title).toBe('Asignación realizada por IA')
    expect(ai.variant).toBe('ai')
    expect(ai.automatic).toBe(true)
    expect(ai.assigneeName).toBe('Ana López')
    expect(ai.factors).toEqual(['Carga de trabajo'])
    expect(ai.body).toBe('Tiene la menor carga de tickets activos.')
    expect(JSON.stringify(ai)).not.toMatch(/AI_ASSIGNED|STATUS_CHANGED|N8N/)

    const manual = buildEventContext({
      oldStatus: 'OPEN',
      newStatus: 'ASSIGNED',
      createdAt: '2026-08-21T12:00:00.000Z',
      eventType: 'ASSIGNED',
      actorType: 'USER',
      changedByName: 'Supervisor Mesa',
      reason: GENERIC_ASSIGNMENT_REASON,
      details: { to: 'Agente Soporte', assignmentKind: 'MANUAL', assigneeName: 'Agente Soporte' },
    })
    expect(manual.title).toBe('Asignación manual')
    expect(manual.showPreview).toBe(false)
    expect(manual.body).toBe('Se asignó a Agente Soporte.')
    expect(manual.automatic).toBe(false)
  })

  it('no muestra tarjeta cuando el evento no tiene motivo ni es una asignación', () => {
    const context = buildEventContext({
      oldStatus: null,
      newStatus: 'OPEN',
      createdAt: '2026-08-21T12:00:00.000Z',
      eventType: 'CREATED',
      changedByName: 'Usuario Solicitante',
      reason: null,
    })
    expect(context.show).toBe(false)
    expect(context.showPreview).toBe(false)
  })

  it('usa etiquetas específicas al capturar el motivo', () => {
    expect(reasonCaptureCopy('IN_PROGRESS', 'ESCALATED', 'escalate').label).toBe('Motivo del escalamiento')
    expect(reasonCaptureCopy('IN_PROGRESS', 'RESOLVED', 'status').label).toBe('Motivo de la resolución')
    expect(reasonCaptureCopy('CLOSED', 'IN_PROGRESS', 'status').label).toBe('Motivo de la reapertura')
    expect(reasonCaptureCopy('IN_PROGRESS', 'WAITING_USER', 'status').helper).toMatch(/historial/)
    expect(JSON.stringify(reasonCaptureCopy('IN_PROGRESS', 'RESOLVED', 'status'))).not.toMatch(/Ã|Â|â|�/)
  })
})
