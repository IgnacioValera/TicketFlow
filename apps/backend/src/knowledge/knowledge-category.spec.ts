import { NotFoundException } from '@nestjs/common'
import { KnowledgeService } from './knowledge.module'

describe('Categoría de artículos', () => {
  it('rechaza con 404 una categoría enviada pero inexistente', async () => {
    const service = new KnowledgeService(
      { save: jest.fn(), create: jest.fn((value) => value), findOne: jest.fn() } as never,
      { findOneBy: jest.fn().mockResolvedValue(null) } as never,
    )
    try {
      await service.create(
        {
          title: 'Guía de VPN',
          content: 'Contenido suficientemente largo para el artículo de conocimiento',
          categoryId: '11111111-1111-4111-8111-111111111111',
        },
        { id: 'user-1' } as never,
      )
      throw new Error('debería fallar')
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException)
      expect((error as NotFoundException).getStatus()).toBe(404)
      expect((error as Error).message).toMatch(/Categoría no encontrada/)
    }
  })

  it('conserva null si no se envía categoría', async () => {
    const save = jest.fn(async (value) => value)
    const service = new KnowledgeService(
      { save, create: jest.fn((value) => value), findOne: jest.fn() } as never,
      { findOneBy: jest.fn() } as never,
    )
    await service.create(
      {
        title: 'Guía de VPN',
        content: 'Contenido suficientemente largo para el artículo de conocimiento',
      },
      { id: 'user-1' } as never,
    )
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ category: null }))
  })
})
