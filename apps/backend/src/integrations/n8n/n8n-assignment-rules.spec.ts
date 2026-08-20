import { TicketStatus } from '../../database/entities'
import {
  applyWorkloadStatus,
  assignmentContextState,
  emptyWorkload,
  enqueueTicketCreatedWebhook,
  isActiveWorkloadStatus,
} from './n8n-assignment-rules'

describe('Reglas de asignación n8n', () => {
  it('cuenta solo estados activos de carga', () => {
    let workload = emptyWorkload()
    workload = applyWorkloadStatus(workload, TicketStatus.ASSIGNED)
    workload = applyWorkloadStatus(workload, TicketStatus.IN_PROGRESS)
    workload = applyWorkloadStatus(workload, TicketStatus.WAITING_USER)
    workload = applyWorkloadStatus(workload, TicketStatus.ESCALATED)
    expect(workload).toEqual({ totalActive: 4, assigned: 1, inProgress: 1, waitingUser: 1, escalated: 1 })
  })

  it('excluye resueltos, cerrados, cancelados y abiertos sin asignar', () => {
    let workload = emptyWorkload()
    workload = applyWorkloadStatus(workload, TicketStatus.RESOLVED)
    workload = applyWorkloadStatus(workload, TicketStatus.CLOSED)
    workload = applyWorkloadStatus(workload, TicketStatus.CANCELLED)
    workload = applyWorkloadStatus(workload, TicketStatus.OPEN)
    expect(workload.totalActive).toBe(0)
    expect(isActiveWorkloadStatus(TicketStatus.RESOLVED)).toBe(false)
    expect(isActiveWorkloadStatus(TicketStatus.ASSIGNED)).toBe(true)
  })

  it('bloquea tickets ya asignados o no elegibles', () => {
    expect(assignmentContextState({ assigneeId: 'agent-1', status: TicketStatus.OPEN })).toEqual({
      processable: false,
      reason: 'ALREADY_ASSIGNED',
    })
    expect(assignmentContextState({ assigneeId: null, status: TicketStatus.IN_PROGRESS })).toEqual({
      processable: false,
      reason: 'NOT_ELIGIBLE',
    })
    expect(assignmentContextState({ assigneeId: null, status: TicketStatus.OPEN })).toEqual({
      processable: true,
      reason: null,
    })
  })

  it('el fallo de n8n no impide continuar tras crear el ticket', async () => {
    const notify = jest.fn().mockRejectedValue(new Error('n8n down'))
    const onError = jest.fn()
    enqueueTicketCreatedWebhook(notify, 'ticket-1', onError)
    expect(notify).toHaveBeenCalledWith('ticket-1')
    await Promise.resolve()
    await Promise.resolve()
    expect(onError).toHaveBeenCalled()
  })
})
