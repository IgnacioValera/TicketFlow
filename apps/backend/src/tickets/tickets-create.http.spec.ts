import { UnprocessableEntityException } from '@nestjs/common'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ConfigService } from '@nestjs/config'
import { ApiExceptionFilter } from '../common/api'
import { TicketsController } from './tickets.controller'
import { TicketsService } from './tickets.service'

describe('HTTP creación de tickets', () => {
  let app: INestApplication
  const create = jest.fn()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: {
            create,
            list: jest.fn(),
            detail: jest.fn(),
            update: jest.fn(),
            changeStatus: jest.fn(),
            assign: jest.fn(),
            escalate: jest.fn(),
            close: jest.fn(),
            listComments: jest.fn(),
            addComment: jest.fn(),
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

  it('rechaza payload inválido con 400', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/tickets').send({
      title: '   ',
      description: 'Descripción válida de ticket',
      categoryId: '11111111-1111-4111-8111-111111111111',
      priorityId: '22222222-2222-4222-8222-222222222222',
    })

    expect(create).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
  })

  it('propaga 422 cuando la categoría está inactiva', async () => {
    create.mockRejectedValue(new UnprocessableEntityException('Categoría no encontrada o inactiva'))

    const response = await request(app.getHttpServer()).post('/api/v1/tickets').send({
      title: 'Incidente válido',
      description: 'Descripción válida de ticket con detalle.',
      categoryId: '11111111-1111-4111-8111-111111111111',
      priorityId: '22222222-2222-4222-8222-222222222222',
    })

    expect(response.status).toBe(422)
    expect(response.body.message).toMatch(/categoría/i)
  })

  it('crea ticket válido una sola vez', async () => {
    create.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      folio: 'HD-2026-0099',
      title: 'Incidente válido',
      status: 'OPEN',
    })

    const payload = {
      title: 'Incidente válido',
      description: 'Descripción válida de ticket con detalle.',
      categoryId: '11111111-1111-4111-8111-111111111111',
      priorityId: '22222222-2222-4222-8222-222222222222',
    }

    const response = await request(app.getHttpServer()).post('/api/v1/tickets').send(payload)

    expect(response.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    expect(response.body.data.folio).toBe('HD-2026-0099')
  })
})
