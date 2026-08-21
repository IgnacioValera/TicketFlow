import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ApiExceptionFilter, ApiResponseInterceptor } from '../../common/api'
import { N8nApiKeyGuard } from './n8n-api-key.guard'
import { N8nIntegrationController } from './n8n-integration.controller'
import { N8nIntegrationService } from './n8n-integration.service'

const API_KEY = 'n8n-integration-test-key-32-chars-min'
const TICKET_ID = '11111111-1111-4111-8111-111111111111'
const AGENT_ID = '22222222-2222-4222-8222-222222222222'
const EVENT_ID = '33333333-3333-4333-8333-333333333333'

describe('HTTP integración n8n', () => {
  let app: INestApplication
  const n8n = {
    assignmentContext: jest.fn(),
    assignByAi: jest.fn(),
    recordAssignmentFailed: jest.fn(),
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [N8nIntegrationController],
      providers: [
        { provide: N8nIntegrationService, useValue: n8n },
        { provide: ConfigService, useValue: { get: (key: string) => (key === 'N8N_INTEGRATION_API_KEY' ? API_KEY : undefined) } },
        N8nApiKeyGuard,
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalInterceptors(new ApiResponseInterceptor())
    app.useGlobalFilters(new ApiExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    n8n.assignmentContext.mockResolvedValue({ processable: true, reason: null, ticket: { id: TICKET_ID }, agents: [] })
    n8n.assignByAi.mockResolvedValue({ status: 'ASSIGNED', ticketId: TICKET_ID, assigneeId: AGENT_ID, assigneeName: 'Agente Soporte' })
    n8n.recordAssignmentFailed.mockResolvedValue({ status: 'RECORDED', ticketId: TICKET_ID })
  })

  it('rechaza API keys incorrectas o ausentes', async () => {
    const missing = await request(app.getHttpServer()).get(`/api/v1/integrations/n8n/tickets/${TICKET_ID}/assignment-context`)
    expect(missing.status).toBe(401)
    expect(n8n.assignmentContext).not.toHaveBeenCalled()
    const wrong = await request(app.getHttpServer())
      .get(`/api/v1/integrations/n8n/tickets/${TICKET_ID}/assignment-context`)
      .set('x-ticketflow-integration-key', 'clave-incorrecta')
    expect(wrong.status).toBe(401)
    expect(wrong.body.message).toBe('No autorizado')
  })

  it('acepta la clave válida y no usa JWT', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/integrations/n8n/tickets/${TICKET_ID}/assignment-context`)
      .set('x-ticketflow-integration-key', API_KEY)
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(n8n.assignmentContext).toHaveBeenCalledWith(TICKET_ID)
  })

  it('rechaza UUID inválido', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/integrations/n8n/tickets/no-es-uuid/assignment-context')
      .set('x-ticketflow-integration-key', API_KEY)
    expect(response.status).toBe(400)
  })

  it('valida el DTO de asignación', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/integrations/n8n/tickets/${TICKET_ID}/assign`)
      .set('x-ticketflow-integration-key', API_KEY)
      .send({ eventId: 'no-uuid', assigneeId: AGENT_ID, reason: 'motivo', confidence: 2 })
    expect(response.status).toBe(400)
    expect(n8n.assignByAi).not.toHaveBeenCalled()
  })

  it('aplica una decisión válida', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/integrations/n8n/tickets/${TICKET_ID}/assign`)
      .set('x-ticketflow-integration-key', API_KEY)
      .send({
        eventId: EVENT_ID,
        assigneeId: AGENT_ID,
        reason: 'Tiene la menor carga activa para atender este ticket.',
        confidence: 0.94,
        workflowExecutionId: '12345',
      })
    expect(response.status).toBe(201)
    expect(response.body.data.status).toBe('ASSIGNED')
    expect(n8n.assignByAi).toHaveBeenCalled()
  })

  it('registra un fallo sin asignar', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/integrations/n8n/tickets/${TICKET_ID}/assignment-failed`)
      .set('x-ticketflow-integration-key', API_KEY)
      .send({ eventId: EVENT_ID, reason: 'La IA no devolvió JSON válido.', workflowExecutionId: '12345' })
    expect(response.status).toBe(201)
    expect(n8n.recordAssignmentFailed).toHaveBeenCalled()
  })
})

describe('N8nApiKeyGuard', () => {
  it('lanza 401 cuando el secreto no coincide', () => {
    const guard = new N8nApiKeyGuard({ get: () => API_KEY } as never)
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      } as never),
    ).toThrow(UnauthorizedException)
  })
})
