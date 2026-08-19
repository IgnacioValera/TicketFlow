import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ConfigService } from '@nestjs/config'
import { ApiExceptionFilter } from '../common/api'
import { TicketStatus } from '../database/entities'
import { TicketsController } from './tickets.controller'
import { TicketsService } from './tickets.service'

describe('HTTP transiciones y mutaciones de tickets', () => {
  let app: INestApplication
  const changeStatus = jest.fn()
  const update = jest.fn()
  const addComment = jest.fn()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: {
            list: jest.fn(),
            create: jest.fn(),
            detail: jest.fn(),
            update,
            changeStatus,
            assign: jest.fn(),
            escalate: jest.fn(),
            close: jest.fn(),
            listComments: jest.fn(),
            addComment,
            listAttachments: jest.fn(),
            addAttachment: jest.fn(),
            getSla: jest.fn(),
            submitSurvey: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:8000' } },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    app.useGlobalFilters(new ApiExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('propaga 422 cuando la transición es inválida', async () => {
    changeStatus.mockRejectedValue(
      new UnprocessableEntityException('Transición de OPEN a RESOLVED no permitida'),
    )

    const response = await request(app.getHttpServer())
      .patch('/api/v1/tickets/11111111-1111-4111-8111-111111111111/status')
      .send({ status: TicketStatus.RESOLVED, reason: 'Intento inválido' })

    expect(response.status).toBe(422)
    expect(response.body.message).toMatch(/Transición/i)
  })

  it('propaga 409 al editar un ticket finalizado', async () => {
    update.mockRejectedValue(
      new ConflictException('El ticket está finalizado (CLOSED) y no admite esta operación'),
    )

    const response = await request(app.getHttpServer())
      .put('/api/v1/tickets/11111111-1111-4111-8111-111111111111')
      .send({ title: 'Nuevo título' })

    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/finalizado/i)
  })

  it('propaga 409 al comentar un ticket cancelado', async () => {
    addComment.mockRejectedValue(
      new ConflictException('El ticket está finalizado (CANCELLED) y no admite esta operación'),
    )

    const response = await request(app.getHttpServer())
      .post('/api/v1/tickets/11111111-1111-4111-8111-111111111111/comments')
      .send({ body: 'Comentario bloqueado' })

    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/finalizado/i)
  })

  it('propaga 403 cuando el rol no puede hacer la transición', async () => {
    changeStatus.mockRejectedValue(new ForbiddenException('No puedes realizar esa transición de estado'))

    const response = await request(app.getHttpServer())
      .patch('/api/v1/tickets/11111111-1111-4111-8111-111111111111/status')
      .send({ status: TicketStatus.CANCELLED, reason: 'Cancelación no autorizada' })

    expect(response.status).toBe(403)
    expect(response.body.message).toMatch(/transición/i)
  })
})
