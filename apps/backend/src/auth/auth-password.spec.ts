import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { AuthService } from './auth.service'

describe('Cambio de contraseña', () => {
  async function createService(currentPassword: string) {
    const passwordHash = await bcrypt.hash(currentPassword, 4)
    const manager = {
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: () => ({ set: () => ({ where: () => ({ execute: jest.fn() }) }) }),
      })),
    }
    const users = {
      createQueryBuilder: jest.fn(() => ({
        addSelect: () => ({
          leftJoinAndSelect: () => ({
            where: () => ({ getOne: async () => ({ id: 'user-1', passwordHash }) }),
          }),
        }),
      })),
    }
    const service = new AuthService(
      users as never,
      { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), createQueryBuilder: jest.fn() } as never,
      { signAsync: jest.fn(), decode: jest.fn(), verifyAsync: jest.fn() } as never,
      { get: jest.fn(), getOrThrow: jest.fn() } as never,
      { transaction: jest.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)) } as never,
    )
    return { service, manager }
  }

  it('rechaza la contraseña actual incorrecta', async () => {
    const { service } = await createService('Actual1!')
    await expect(
      service.changePassword('user-1', { currentPassword: 'OtraClave1!', newPassword: 'NuevaClave1!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rechaza una contraseña nueva igual a la actual', async () => {
    const { service } = await createService('Actual1!')
    await expect(
      service.changePassword('user-1', { currentPassword: 'Actual1!', newPassword: 'Actual1!' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rechaza una contraseña débil', async () => {
    const { service } = await createService('Actual1!')
    await expect(
      service.changePassword('user-1', { currentPassword: 'Actual1!', newPassword: 'debil' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('actualiza el hash y limpia mustChangePassword', async () => {
    const { service, manager } = await createService('Actual1!')
    await service.changePassword('user-1', { currentPassword: 'Actual1!', newPassword: 'NuevaClave1!' })
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ mustChangePassword: false }),
    )
    const hash = manager.update.mock.calls[0][2].passwordHash as string
    expect(await bcrypt.compare('NuevaClave1!', hash)).toBe(true)
  })
})
