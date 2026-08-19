import { ConflictException } from '@nestjs/common'
import { CatalogStatus } from '../database/entities'
import { CatalogsService } from './catalogs.service'

describe('CatalogsService políticas SLA', () => {
  const critical = { id: 'prio-critical', name: 'Crítica' }
  const medium = { id: 'prio-medium', name: 'Media' }
  const policy = {
    id: '1d04b500-602b-4ffc-9b5f-cc15956e306d',
    name: 'SLA Crítica',
    priority: critical,
    responseHours: 1,
    resolutionHours: 8,
    status: CatalogStatus.ACTIVE,
  }

  function createService(options: { priorityTaken?: boolean } = {}) {
    const policies = {
      findOne: jest.fn().mockResolvedValue({ ...policy, priority: { ...critical } }),
      exists: jest.fn().mockResolvedValue(Boolean(options.priorityTaken)),
      save: jest.fn(async (item: typeof policy) => item),
      create: jest.fn((item: typeof policy) => item),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getExists: jest.fn().mockResolvedValue(false),
      })),
    }
    const priorities = {
      findOne: jest.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === medium.id) return medium
        if (where.id === critical.id) return critical
        return null
      }),
    }
    const service = new CatalogsService({} as never, priorities as never, policies as never)
    return { service, policies }
  }

  it('rechaza cambiar la prioridad si otra política ya la usa', async () => {
    const { service, policies } = createService({ priorityTaken: true })
    await expect(service.updatePolicy(policy.id, { priorityId: medium.id })).rejects.toMatchObject({
      constructor: ConflictException,
      message: 'Ya existe una política SLA para esa prioridad',
    })
    expect(policies.save).not.toHaveBeenCalled()
  })

  it('permite actualizar la prioridad cuando está libre', async () => {
    const { service, policies } = createService({ priorityTaken: false })
    const result = await service.updatePolicy(policy.id, { priorityId: medium.id })
    expect(result.priorityId).toBe(medium.id)
    expect(result.priorityName).toBe('Media')
    expect(policies.save).toHaveBeenCalled()
  })

  it('permite conservar la misma prioridad en una actualización parcial', async () => {
    const { service, policies } = createService({ priorityTaken: false })
    const result = await service.updatePolicy(policy.id, { responseHours: 2 })
    expect(result.priorityId).toBe(critical.id)
    expect(result.responseHours).toBe(2)
    expect(result.resolutionHours).toBe(8)
    expect(policies.save).toHaveBeenCalled()
  })
})
