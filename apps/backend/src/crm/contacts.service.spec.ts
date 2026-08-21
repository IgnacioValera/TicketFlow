import { ConflictException, NotFoundException } from '@nestjs/common'
import { ContactsService } from './contacts.service'
import { isForeignKeyViolation } from './db-errors'

describe('ContactsService', () => {
  const contact = {
    id: '11111111-1111-4111-8111-111111111111',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@acme.test',
    phone: '7771110000',
    jobTitle: 'Compras',
    isPrimary: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    client: { id: 'c1', name: 'Acme Corp' },
  }

  function buildService(overrides: Record<string, unknown> = {}) {
    const remove = jest.fn().mockResolvedValue(contact)
    const repo = {
      findOne: jest.fn().mockResolvedValue(contact),
      save: jest.fn().mockResolvedValue(contact),
      remove,
      manager: {
        transaction: jest.fn(async (work: (manager: { remove: typeof remove }) => Promise<unknown>) => work({ remove })),
      },
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({ execute: jest.fn().mockResolvedValue(undefined) }),
          }),
        }),
      }),
      ...overrides,
    }
    const clients = {
      getAccessible: jest.fn().mockResolvedValue(contact.client),
    }
    return {
      service: new ContactsService(repo as never, clients as never),
      repo,
      clients,
    }
  }

  it('edita un contacto existente', async () => {
    const { service, repo } = buildService()
    await service.update(contact.id, { firstName: 'Ana', lastName: 'García', email: 'ana@acme.test' } as never, { id: 'u1' } as never)
    expect(repo.save).toHaveBeenCalled()
  })

  it('404 si el contacto no existe', async () => {
    const { service } = buildService({ findOne: jest.fn().mockResolvedValue(null) })
    await expect(service.update(contact.id, { firstName: 'Ana' } as never, { id: 'u1' } as never)).rejects.toBeInstanceOf(NotFoundException)
    await expect(service.remove(contact.id, { id: 'u1' } as never)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('409 si una relación impide borrar el contacto', async () => {
    const { service, repo } = buildService({
      manager: {
        transaction: jest.fn(async () => {
          throw { code: '23503' }
        }),
      },
    })
    expect(isForeignKeyViolation({ code: '23503' })).toBe(true)
    await expect(service.remove(contact.id, { id: 'u1' } as never)).rejects.toBeInstanceOf(ConflictException)
    expect(repo.manager.transaction).toHaveBeenCalled()
  })
})
