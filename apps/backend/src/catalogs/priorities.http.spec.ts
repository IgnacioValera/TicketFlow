import { ConflictException } from '@nestjs/common'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { PrioritiesController } from './catalogs.controller'
import { CatalogsService } from './catalogs.service'

describe('HTTP prioridades', () => {
  let app: INestApplication
  const createPriority = jest.fn()
  const updatePriority = jest.fn()
  const setPriorityStatus = jest.fn()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PrioritiesController],
      providers: [
        {
          provide: CatalogsService,
          useValue: {
            listPriorities: jest.fn(),
            createPriority,
            updatePriority,
            setPriorityStatus,
            deactivatePriority: jest.fn(),
          },
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza color inválido con 400', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/priorities').send({
      name: 'Urgente',
      level: 'HIGH',
      color: 'rojo',
    })

    expect(createPriority).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    expect(JSON.stringify(response.body)).toMatch(/hexadecimal/i)
  })

  it('acepta prioridad válida con hex', async () => {
    createPriority.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Urgente',
      level: 'HIGH',
      color: '#2563EB',
      description: '',
      status: 'ACTIVE',
    })

    const response = await request(app.getHttpServer()).post('/api/v1/priorities').send({
      name: 'Urgente',
      level: 'HIGH',
      color: '#2563eb',
    })

    expect(response.status).toBe(201)
    expect(createPriority).toHaveBeenCalledWith(
      expect.objectContaining({ color: '#2563eb', name: 'Urgente' }),
    )
  })

  it('propaga conflicto de nivel duplicado con 409', async () => {
    createPriority.mockRejectedValue(new ConflictException('Ya existe una prioridad con ese nivel'))

    const response = await request(app.getHttpServer()).post('/api/v1/priorities').send({
      name: 'Otra media',
      level: 'MEDIUM',
      color: '#0F766E',
    })

    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/nivel/i)
  })

  it('actualiza estado con PATCH /status', async () => {
    setPriorityStatus.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'INACTIVE',
    })

    const response = await request(app.getHttpServer())
      .patch('/api/v1/priorities/11111111-1111-4111-8111-111111111111/status')
      .send({ status: 'INACTIVE' })

    expect(response.status).toBe(200)
    expect(setPriorityStatus).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'INACTIVE',
    )
  })
})
