import { NotFoundException } from '@nestjs/common'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { KnowledgeController, KnowledgeService } from './knowledge.module'

describe('HTTP base de conocimiento', () => {
  let app: INestApplication
  const list = jest.fn()
  const find = jest.fn()
  const create = jest.fn()
  const update = jest.fn()
  const remove = jest.fn()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        {
          provide: KnowledgeService,
          useValue: { list, find, create, update, remove },
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

  it('lista artículos con búsqueda', async () => {
    list.mockResolvedValue([{ id: '1', title: 'Cómo restablecer la contraseña' }])
    const response = await request(app.getHttpServer())
      .get('/api/v1/knowledge-articles')
      .query({ search: 'contraseña' })
    expect(response.status).toBe(200)
    expect(list).toHaveBeenCalledWith('contraseña')
  })

  it('devuelve 404 para UUID inexistente', async () => {
    find.mockRejectedValue(new NotFoundException('Artículo no encontrado'))
    const response = await request(app.getHttpServer()).get(
      '/api/v1/knowledge-articles/11111111-1111-4111-8111-111111111111',
    )
    expect(response.status).toBe(404)
    expect(response.body.message).toMatch(/Artículo no encontrado/)
  })

  it('rechaza categoryId inválido con 400', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/knowledge-articles').send({
      title: 'Guía de accesos',
      content: 'Contenido suficientemente largo para validar el artículo de conocimiento.',
      categoryId: 'no-es-uuid',
    })
    expect(create).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
  })

  it('propaga 404 cuando la categoría no existe', async () => {
    create.mockRejectedValue(new NotFoundException('Categoría no encontrada'))
    const response = await request(app.getHttpServer()).post('/api/v1/knowledge-articles').send({
      title: 'Guía de accesos',
      content: 'Contenido suficientemente largo para validar el artículo de conocimiento.',
      categoryId: '11111111-1111-4111-8111-111111111111',
    })
    expect(response.status).toBe(404)
    expect(response.body.message).toMatch(/Categoría no encontrada/)
  })
})
