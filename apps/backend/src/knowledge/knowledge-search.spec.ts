import { KnowledgeService } from './knowledge.module'

describe('Búsqueda de artículos', () => {
  it('busca por título, contenido y etiquetas', async () => {
    const getMany = jest.fn().mockResolvedValue([])
    const andWhere = jest.fn()
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere,
      orderBy: jest.fn().mockReturnThis(),
      getMany,
    }
    const service = new KnowledgeService(
      { createQueryBuilder: jest.fn(() => qb) } as never,
      { findOneBy: jest.fn() } as never,
    )
    await service.list('contraseña')
    expect(andWhere).toHaveBeenCalledWith(
      '(LOWER(article.title) LIKE :q OR LOWER(article.content) LIKE :q OR LOWER(article.tags) LIKE :q)',
      { q: '%contraseña%' },
    )
  })
})
