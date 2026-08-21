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
    expect(await bcrypt.compare('Actual1!', hash)).toBe(false)
  })
})

describe('Inicio de sesión', () => {
  async function createLoginService(user: object | null) {
    const users = {
      createQueryBuilder: jest.fn(() => ({
        addSelect() {
          return this
        },
        leftJoinAndSelect() {
          return this
        },
        where() {
          return this
        },
        getOne: async () => user,
      })),
      save: jest.fn(async (value: object) => value),
    }
    const refreshTokens = {
      findOne: jest.fn(),
      save: jest.fn(async (value: object) => value),
      create: jest.fn((value: object) => value),
      createQueryBuilder: jest.fn(),
    }
    const jwt = {
      signAsync: jest.fn(async () => 'signed-token'),
      decode: jest.fn(() => ({ exp: 2_000_000_000 })),
      verifyAsync: jest.fn(),
    }
    const config = {
      get: jest.fn((key: string) => (key.includes('EXPIRES') ? '15m' : undefined)),
      getOrThrow: jest.fn((key: string) => `${key}-secret`),
    }
    return new AuthService(
      users as never,
      refreshTokens as never,
      jwt as never,
      config as never,
      { transaction: jest.fn() } as never,
    )
  }

  it('rechaza un usuario inactivo con mensaje genérico', async () => {
    const passwordHash = await bcrypt.hash('Password1!', 4)
    const service = await createLoginService({
      id: 'user-5',
      email: 'inactive@helpdesk.com',
      passwordHash,
      status: 'INACTIVE',
      role: { code: 'AGENT', permissions: [] },
      mustChangePassword: false,
    })
    await expect(service.login({ email: 'inactive@helpdesk.com', password: 'Password1!' })).rejects.toThrow(
      'Credenciales inválidas o cuenta no disponible.',
    )
  })

  it('permite autenticarse con contraseña temporal y expone mustChangePassword', async () => {
    const passwordHash = await bcrypt.hash('Tf-A7k9!mQ2', 4)
    const service = await createLoginService({
      id: 'user-2',
      fullName: 'Agente Soporte',
      email: 'agent@helpdesk.com',
      passwordHash,
      status: 'ACTIVE',
      role: { code: 'AGENT', permissions: [] },
      mustChangePassword: true,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    const result = await service.login({ email: 'agent@helpdesk.com', password: 'Tf-A7k9!mQ2' })
    expect(result.user.mustChangePassword).toBe(true)
    expect(result.accessToken).toBe('signed-token')
  })

  it('un usuario reactivado puede iniciar sesión con su contraseña vigente', async () => {
    const passwordHash = await bcrypt.hash('Password1!', 4)
    const service = await createLoginService({
      id: 'user-2',
      fullName: 'Agente Soporte',
      email: 'agent@helpdesk.com',
      passwordHash,
      status: 'ACTIVE',
      role: { code: 'AGENT', permissions: [] },
      mustChangePassword: false,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    const result = await service.login({ email: 'agent@helpdesk.com', password: 'Password1!' })
    expect(result.user.mustChangePassword).toBe(false)
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
      relations: { role: { permissions: { module: true } }, client: true },
    })
    expect(result.fullName).toBe('Admin Actualizado')
    expect(result.role).toBe('ADMIN')
    expect(saved[0]?.role.code).toBe('ADMIN')
  })
})

describe('Sesión y tokens posteriores a reset o desactivación', () => {
  it('validateUser rechaza una cuenta inactiva aunque el access token siga firmado', async () => {
    const users = {
      findOne: jest.fn(async () => ({
        id: 'user-2',
        status: 'INACTIVE',
        mustChangePassword: false,
        role: { code: 'AGENT', permissions: [] },
      })),
    }
    const service = new AuthService(
      users as never,
      { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), createQueryBuilder: jest.fn() } as never,
      { signAsync: jest.fn(), decode: jest.fn(), verifyAsync: jest.fn() } as never,
      { get: jest.fn(), getOrThrow: jest.fn() } as never,
      { transaction: jest.fn() } as never,
    )
    await expect(service.validateUser('user-2')).rejects.toThrow('Sesión inválida')
  })

  it('refresh rechaza un token revocado tras restablecer o desactivar', async () => {
    const jwt = {
      signAsync: jest.fn(),
      decode: jest.fn(),
      verifyAsync: jest.fn(async () => ({ sub: 'user-2', type: 'refresh' })),
    }
    const refreshTokens = {
      findOne: jest.fn(async () => null),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    }
    const service = new AuthService(
      { findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() } as never,
      refreshTokens as never,
      jwt as never,
      { get: jest.fn(), getOrThrow: jest.fn(() => 'refresh-secret') } as never,
      { transaction: jest.fn() } as never,
    )
    await expect(service.refresh('revoked-refresh-token')).rejects.toThrow('Refresh token revocado')
  })
})
