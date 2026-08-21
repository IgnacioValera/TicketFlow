import { UnprocessableEntityException } from '@nestjs/common'
import { QueryFailedError } from 'typeorm'
import { HistoryActorType, RoleCode, TicketStatus, UserStatus } from '../../database/entities'
import { NotificationType } from '../../notifications/notification-rules'
import { N8nIntegrationService } from './n8n-integration.service'
import { N8N_WEBHOOK_SECRET_HEADER } from './n8n-assignment-rules'

const TICKET_ID = '11111111-1111-4111-8111-111111111111'
const AGENT_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_AGENT_ID = '44444444-4444-4444-8444-444444444444'
const EVENT_ID = '33333333-3333-4333-8333-333333333333'
const REQUESTER_ID = '55555555-5555-4555-8555-555555555555'

function agentUser(overrides: { id?: string; status?: UserStatus; role?: RoleCode; fullName?: string } = {}) {
  return {
    id: overrides.id ?? AGENT_ID,
    fullName: overrides.fullName ?? 'Agente Soporte',
    status: overrides.status ?? UserStatus.ACTIVE,
    role: { code: overrides.role ?? RoleCode.AGENT },
  }
}

function openTicket(assignee: ReturnType<typeof agentUser> | null = null, status = TicketStatus.OPEN) {
  return {
    id: TICKET_ID,
    folio: 'HD-2026-0100',
    title: 'Servidor sin conexión',
    description: 'No responde el servidor principal',
    status,
    assignee,
    requester: { id: REQUESTER_ID, fullName: 'Usuario Solicitante' },
    category: { id: 'cat-1', name: 'Infraestructura' },
    priority: { id: 'pri-1', name: 'Alta', level: 'HIGH' },
    client: { id: 'cli-1', name: 'Cliente' },
    createdAt: new Date('2026-08-20T12:00:00.000Z'),
    slaDueAt: new Date('2026-08-21T12:00:00.000Z'),
  }
}

function createMutex() {
  let locked = Promise.resolve()
  return {
    async run<T>(fn: () => Promise<T>) {
      const previous = locked
      let release = () => undefined as void
      locked = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      try {
        return await fn()
      } finally {
        release()
      }
    },
  }
}

describe('N8nIntegrationService', () => {
  const notifications = { dispatch: jest.fn().mockResolvedValue(undefined) }
  const config = { get: jest.fn() }
  const users = { createQueryBuilder: jest.fn(), findOne: jest.fn() }
  const ticketsRepo = { findOne: jest.fn(), createQueryBuilder: jest.fn() }
  let ticketState: ReturnType<typeof openTicket>
  let histories: Array<Record<string, unknown>>
  const mutex = createMutex()
  const originalFetch = global.fetch

  function historyRepo() {
    const filters: { eventType?: string; eventId?: string } = {}
    const chain: { where: jest.Mock; andWhere: jest.Mock; getOne: jest.Mock } = {
      where: jest.fn(),
      andWhere: jest.fn(),
      getOne: jest.fn(),
    }
    chain.where.mockReturnValue(chain)
    chain.andWhere.mockImplementation((_sql: string, params?: { eventType?: string; eventId?: string }) => {
      Object.assign(filters, params)
      return chain
    })
    chain.getOne.mockImplementation(async () =>
      histories.find((item) => {
        if (filters.eventType && item.eventType !== filters.eventType) return false
        const storedEventId = (item.details as { eventId?: string } | undefined)?.eventId
        if (filters.eventId && storedEventId !== filters.eventId) return false
        return true
      }) ?? null,
    )
    return {
      createQueryBuilder: () => chain,
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => {
        const stored = { id: `h-${histories.length + 1}`, ...value }
        histories.push(stored)
        return stored
      }),
    }
  }

  function manager() {
    return {
      getRepository: (entity: { name?: string }) => {
        if (entity.name === 'Ticket') {
          return {
            createQueryBuilder: () => ({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn(async () => ticketState),
            }),
            findOne: jest.fn(async () => ticketState),
            save: jest.fn(async (ticket: ReturnType<typeof openTicket>) => {
              ticketState = ticket
              return ticket
            }),
          }
        }
        if (entity.name === 'User') {
          return { findOne: users.findOne }
        }
        return historyRepo()
      },
    }
  }

  const dataSource = {
    transaction: jest.fn((fn: (em: ReturnType<typeof manager>) => unknown) =>
      mutex.run(async () => fn(manager())),
    ),
  }

  const service = new N8nIntegrationService(
    ticketsRepo as never,
    users as never,
    dataSource as never,
    config as never,
    notifications as never,
  )

  beforeEach(() => {
    jest.clearAllMocks()
    ticketState = openTicket()
    histories = []
    notifications.dispatch.mockResolvedValue(undefined)
    config.get.mockImplementation((key: string) => {
      if (key === 'N8N_TICKET_CREATED_WEBHOOK_URL') return 'https://n8n.example/webhook/ticket-created'
      if (key === 'N8N_WEBHOOK_SECRET') return 'webhook-secret-at-least-32-characters-long'
      return undefined
    })
    users.findOne.mockResolvedValue(agentUser())
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('envía el webhook TICKET_CREATED después de crear', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock as unknown as typeof fetch
    await service.notifyTicketCreated(TICKET_ID)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://n8n.example/webhook/ticket-created')
    const body = JSON.parse(String(options.body)) as { eventType: string; ticketId: string; eventId: string }
    expect(body.eventType).toBe('TICKET_CREATED')
    expect(body.ticketId).toBe(TICKET_ID)
    expect(body.eventId).toMatch(/^[0-9a-f-]{36}$/)
    expect(options.headers).toMatchObject({ [N8N_WEBHOOK_SECRET_HEADER]: 'webhook-secret-at-least-32-characters-long' })
    expect(JSON.stringify(options)).not.toMatch(/N8N_INTEGRATION_API_KEY|password/)
  })

  it('omite el webhook si la URL no está configurada', async () => {
    config.get.mockReturnValue('')
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    await service.notifyTicketCreated(TICKET_ID)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('el contexto solo incluye agentes ACTIVE y carga activa', async () => {
    ticketsRepo.findOne.mockResolvedValue(openTicket())
    const inactive = agentUser({ id: 'inactive', status: UserStatus.INACTIVE, fullName: 'Inactivo' })
    users.createQueryBuilder.mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([agentUser()]),
    })
    ticketsRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { assigneeId: AGENT_ID, status: TicketStatus.ASSIGNED, count: '1' },
        { assigneeId: AGENT_ID, status: TicketStatus.IN_PROGRESS, count: '2' },
        { assigneeId: AGENT_ID, status: TicketStatus.WAITING_USER, count: '1' },
        { assigneeId: AGENT_ID, status: TicketStatus.ESCALATED, count: '0' },
      ]),
    })
    const context = await service.assignmentContext(TICKET_ID)
    expect(context.processable).toBe(true)
    expect(context.agents).toHaveLength(1)
    expect(context.agents[0]?.id).toBe(AGENT_ID)
    expect(context.agents[0]?.workload).toEqual({ totalActive: 4, assigned: 1, inProgress: 2, waitingUser: 1, escalated: 0 })
    expect(JSON.stringify(context)).not.toMatch(/@|password|token|INACTIVE/)
    expect(inactive.status).toBe(UserStatus.INACTIVE)
  })

  it('no procesa un ticket ya asignado', async () => {
    ticketsRepo.findOne.mockResolvedValue(openTicket(agentUser(), TicketStatus.ASSIGNED))
    const context = await service.assignmentContext(TICKET_ID)
    expect(context.processable).toBe(false)
    expect(context.reason).toBe('ALREADY_ASSIGNED')
    expect(context.agents).toEqual([])
  })

  it('asigna un agente válido y registra Agente de IA', async () => {
    const result = await service.assignByAi(TICKET_ID, {
      eventId: EVENT_ID,
      assigneeId: AGENT_ID,
      reason: 'Tiene la menor carga activa para atender este ticket.',
      confidence: 0.94,
      workflowExecutionId: '12345',
    })
    expect(result.status).toBe('ASSIGNED')
    expect(ticketState.status).toBe(TicketStatus.ASSIGNED)
    expect(ticketState.assignee?.id).toBe(AGENT_ID)
    expect(histories[0]?.actorName).toBe('Agente de IA')
    expect(histories[0]?.actorType).toBe(HistoryActorType.SYSTEM)
    expect(histories[0]?.eventType).toBe('AI_ASSIGNED')
    expect(histories[0]?.changedBy).toBeNull()
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: NotificationType.TICKET_ASSIGNED, actor: null }),
    )
  })

  it('rechaza agentes inactivos, bloqueados o de otro rol', async () => {
    users.findOne.mockResolvedValueOnce(agentUser({ status: UserStatus.INACTIVE }))
    await expect(
      service.assignByAi(TICKET_ID, { eventId: EVENT_ID, assigneeId: AGENT_ID, reason: 'motivo válido de la IA', confidence: 0.5 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
    users.findOne.mockResolvedValueOnce(agentUser({ status: UserStatus.LOCKED }))
    await expect(
      service.assignByAi(TICKET_ID, { eventId: EVENT_ID, assigneeId: AGENT_ID, reason: 'motivo válido de la IA', confidence: 0.5 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
    users.findOne.mockResolvedValueOnce(agentUser({ role: RoleCode.ADMIN }))
    await expect(
      service.assignByAi(TICKET_ID, { eventId: EVENT_ID, assigneeId: AGENT_ID, reason: 'motivo válido de la IA', confidence: 0.5 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
    expect(ticketState.assignee).toBeNull()
    expect(ticketState.status).toBe(TicketStatus.OPEN)
  })

  it('nunca sobrescribe una asignación previa', async () => {
    ticketState = openTicket(agentUser({ id: OTHER_AGENT_ID, fullName: 'Otro Agente' }), TicketStatus.ASSIGNED)
    const result = await service.assignByAi(TICKET_ID, {
      eventId: EVENT_ID,
      assigneeId: AGENT_ID,
      reason: 'motivo válido de la IA',
      confidence: 0.8,
    })
    expect(result.status).toBe('SKIPPED_ALREADY_ASSIGNED')
    expect(result.assigneeId).toBe(OTHER_AGENT_ID)
    expect(histories).toHaveLength(0)
  })

  it('dos solicitudes concurrentes no asignan agentes distintos', async () => {
    users.findOne.mockImplementation(async ({ where }: { where: { id: string } }) => agentUser({ id: where.id, fullName: where.id }))
    const first = service.assignByAi(TICKET_ID, {
      eventId: EVENT_ID,
      assigneeId: AGENT_ID,
      reason: 'primera decisión',
      confidence: 0.9,
    })
    const second = service.assignByAi(TICKET_ID, {
      eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      assigneeId: OTHER_AGENT_ID,
      reason: 'segunda decisión',
      confidence: 0.1,
    })
    const results = await Promise.all([first, second])
    const assigned = results.filter((item) => item.status === 'ASSIGNED')
    const skipped = results.filter((item) => item.status === 'SKIPPED_ALREADY_ASSIGNED')
    expect(assigned).toHaveLength(1)
    expect(skipped).toHaveLength(1)
    expect(ticketState.assignee?.id).toBe(assigned[0]?.assigneeId)
  })

  it('repetir el mismo eventId no duplica el historial', async () => {
    await service.assignByAi(TICKET_ID, {
      eventId: EVENT_ID,
      assigneeId: AGENT_ID,
      reason: 'primera vez',
      confidence: 0.9,
    })
    const second = await service.assignByAi(TICKET_ID, {
      eventId: EVENT_ID,
      assigneeId: AGENT_ID,
      reason: 'reintento',
      confidence: 0.9,
    })
    expect(second.status).toBe('ASSIGNED')
    expect(histories.filter((item) => item.eventType === 'AI_ASSIGNED')).toHaveLength(1)
  })

  it('un fallo deja el ticket disponible para asignación manual', async () => {
    const result = await service.recordAssignmentFailed(TICKET_ID, {
      eventId: EVENT_ID,
      reason: 'La IA no devolvió JSON válido.',
      workflowExecutionId: '12345',
    })
    expect(result.status).toBe('RECORDED')
    expect(ticketState.assignee).toBeNull()
    expect(ticketState.status).toBe(TicketStatus.OPEN)
    expect(histories[0]?.eventType).toBe('AI_ASSIGNMENT_FAILED')
    expect(histories[0]?.actorName).toBe('Agente de IA')
    const duplicate = await service.recordAssignmentFailed(TICKET_ID, {
      eventId: EVENT_ID,
      reason: 'La IA no devolvió JSON válido.',
    })
    expect(duplicate.status).toBe('RECORDED')
    expect(histories.filter((item) => item.eventType === 'AI_ASSIGNMENT_FAILED')).toHaveLength(1)
    ticketState = openTicket(agentUser(), TicketStatus.ASSIGNED)
    const afterManual = await service.recordAssignmentFailed(TICKET_ID, {
      eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      reason: 'tarde',
    })
    expect(afterManual.status).toBe('SKIPPED_ALREADY_ASSIGNED')
  })

  it('tolera una violación de unicidad al repetir el evento', async () => {
    const uniqueError = Object.assign(new QueryFailedError('insert', [], new Error('duplicate')), {
      driverError: { code: '23505' },
    })
    dataSource.transaction.mockImplementationOnce((fn: (em: never) => unknown) =>
      mutex.run(async () => {
        const base = manager()
        return fn({
          getRepository: (entity: { name?: string }) => {
            const repo = base.getRepository(entity)
            if (entity.name !== 'Ticket' && entity.name !== 'User') {
              return {
                createQueryBuilder: () => ({
                  where: jest.fn().mockReturnThis(),
                  andWhere: jest.fn().mockReturnThis(),
                  getOne: jest.fn().mockResolvedValue(null),
                }),
                create: jest.fn((value: Record<string, unknown>) => value),
                save: jest.fn().mockRejectedValue(uniqueError),
              }
            }
            return repo
          },
        } as never)
      }),
    )
    await expect(
      service.assignByAi(TICKET_ID, {
        eventId: EVENT_ID,
        assigneeId: AGENT_ID,
        reason: 'carrera de eventId',
        confidence: 0.5,
      }),
    ).resolves.toMatchObject({ status: 'ASSIGNED', assigneeId: AGENT_ID })
  })
})
