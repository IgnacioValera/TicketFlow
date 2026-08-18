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

describe('Actualización del perfil propio', () => {
  it('actualiza sólo el nombre del usuario autenticado y no acepta un rol', async () => {
    const saved: Array<{ fullName: string; role: { code: string } }> = []
    const user = {
      id: 'user-1',
      fullName: 'Admin Sistema',
      email: 'admin@helpdesk.com',
      status: 'ACTIVE',
      lastLoginAt: new Date('2026-08-17T15:00:00.000Z'),
      createdAt: new Date('2026-01-10T09:00:00.000Z'),
      mustChangePassword: false,
      role: { code: 'ADMIN', permissions: [] },
    }
    const users = {
      findOne: jest.fn(async () => user),
      save: jest.fn(async (value: typeof user) => {
        saved.push({ fullName: value.fullName, role: { code: value.role.code } })
        return value
      }),
      createQueryBuilder: jest.fn(),
    }
    const service = new AuthService(
      users as never,
      { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), createQueryBuilder: jest.fn() } as never,
      { signAsync: jest.fn(), decode: jest.fn(), verifyAsync: jest.fn() } as never,
      { get: jest.fn(), getOrThrow: jest.fn() } as never,
      { transaction: jest.fn() } as never,
    )

    const result = await service.updateOwnProfile('user-1', { fullName: '  Admin Actualizado  ' })

    expect(users.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      relations: { role: { permissions: true } },
    })
    expect(result.fullName).toBe('Admin Actualizado')
    expect(result.role).toBe('ADMIN')
    expect(saved[0]?.role.code).toBe('ADMIN')
  })
})
