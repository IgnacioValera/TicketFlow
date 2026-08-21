import { ClientStatus, RoleCode, TicketStatus, UserStatus } from '../database/entities'
import { enqueueTicketCreatedWebhook } from '../integrations/n8n/n8n-assignment-rules'
import { TicketsService } from './tickets.service'

describe('Creación de tickets e integración n8n', () => {
  const n8n = { notifyTicketCreated: jest.fn() }
  const notifications = { dispatch: jest.fn().mockResolvedValue(undefined) }
  const actor = {
    id: 'req-1',
    fullName: 'Usuario Solicitante',
    role: { code: RoleCode.REQUESTER },
    client: { id: 'cli-1', name: 'Acme', status: ClientStatus.ACTIVE },
    status: UserStatus.ACTIVE,
  }
  const category = { id: 'cat-1', name: 'Hardware', status: 'ACTIVE' }
  const priority = { id: 'pri-1', name: 'Alta', color: '#f00' }
  const policy = { resolutionHours: 8, status: 'ACTIVE', priority }
  const users = { findOne: jest.fn().mockResolvedValue(actor) }
  const categories = { findOneBy: jest.fn().mockResolvedValue(category) }
  const priorities = { findOneBy: jest.fn().mockResolvedValue(priority) }
  const policies = { findOne: jest.fn().mockResolvedValue(policy) }
  const savedTicket = {
    id: '11111111-1111-4111-8111-111111111111',
    folio: 'HD-2026-0101',
    title: 'Servidor caído',
    description: 'No responde el servidor principal',
    status: TicketStatus.OPEN,
    category,
    priority,
    requester: actor,
    assignee: null,
    client: actor.client,
    slaCreatedAt: new Date('2026-08-20T12:00:00.000Z'),
    slaDueAt: new Date('2026-08-20T20:00:00.000Z'),
    resolutionHours: 8,
    closedAt: null,
    createdAt: new Date('2026-08-20T12:00:00.000Z'),
  }
  const dataSource = {
    transaction: jest.fn(),
  }
  const service = new TicketsService(
    {} as never,
    categories as never,
    priorities as never,
    policies as never,
    {} as never,
    users as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    dataSource as never,
    { get: () => 'http://localhost:8000' } as never,
    notifications as never,
    n8n as never,
  )

  beforeEach(() => {
    jest.clearAllMocks()
    users.findOne.mockResolvedValue(actor)
    categories.findOneBy.mockResolvedValue(category)
    priorities.findOneBy.mockResolvedValue(priority)
    policies.findOne.mockResolvedValue(policy)
    n8n.notifyTicketCreated.mockResolvedValue(undefined)
  })

  it('crea el ticket aunque n8n falle y notifica después de la transacción', async () => {
    n8n.notifyTicketCreated.mockRejectedValue(new Error('n8n no disponible'))
    dataSource.transaction.mockImplementation(async (fn: (manager: unknown) => unknown) => {
      expect(n8n.notifyTicketCreated).not.toHaveBeenCalled()
      const manager = {
        getRepository: () => ({
          createQueryBuilder: () => ({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({ year: 2026, value: 100 }),
          }),
          save: jest.fn(async (value: unknown) => {
            if (value && typeof value === 'object' && 'folio' in (value as object)) return savedTicket
            if (value && typeof value === 'object' && 'eventType' in (value as object)) return { id: 'hist-1', ...(value as object) }
            return { year: 2026, value: 101, ...(value as object) }
          }),
          create: jest.fn((value: unknown) => value),
        }),
      }
      return fn(manager)
    })
    const created = await service.create(
      {
        title: 'Servidor caído',
        description: 'No responde el servidor principal',
        categoryId: '11111111-1111-4111-8111-111111111111',
        priorityId: '22222222-2222-4222-8222-222222222222',
      },
      actor as never,
    )
    expect(created.status).toBe(TicketStatus.OPEN)
    expect(created.assigneeId).toBeNull()
    expect(n8n.notifyTicketCreated).toHaveBeenCalledWith(savedTicket.id)
    await Promise.resolve()
    expect(created.folio).toBe('HD-2026-0101')
  })

  it('encola el webhook sin bloquear al llamador', async () => {
    const notify = jest.fn().mockRejectedValue(new Error('timeout'))
    const onError = jest.fn()
    enqueueTicketCreatedWebhook(notify, savedTicket.id, onError)
    expect(notify).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    await Promise.resolve()
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
