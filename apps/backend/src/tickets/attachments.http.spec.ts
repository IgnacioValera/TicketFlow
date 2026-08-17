import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { TicketsController } from './tickets.controller'
import { TicketsService } from './tickets.service'
import { ConfigService } from '@nestjs/config'
import { ApiExceptionFilter } from '../common/api'
import { LIMITS } from '../common/limits'

describe('HTTP adjuntos y UUID', () => {
  let app: INestApplication
  const addAttachment = jest.fn()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: { addAttachment, detail: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:8000' } },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalFilters(new ApiExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('devuelve 400 si el UUID de ruta es inválido', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/tickets/not-a-uuid')
    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/UUID/i)
  })

  it('devuelve 413 al subir un archivo mayor a 5 MB contra el endpoint real', async () => {
    const oversized = Buffer.alloc(LIMITS.FILE_MAX_BYTES + 1024, 1)
    const response = await request(app.getHttpServer())
      .post('/api/v1/tickets/11111111-1111-4111-8111-111111111111/attachments')
      .attach('file', oversized, { filename: 'grande.pdf', contentType: 'application/pdf' })

    expect(addAttachment).not.toHaveBeenCalled()
    expect(response.status).toBe(413)
    expect(response.body.message).toMatch(/5 MB/i)
  })
})
