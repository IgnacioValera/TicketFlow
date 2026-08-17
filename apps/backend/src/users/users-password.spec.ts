import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { RoleCode, UserStatus } from '../database/entities'
import { UsersService } from './users.service'

describe('Restablecimiento administrativo de contraseña', () => {
  const admin = { id: 'admin-1', role: { code: RoleCode.ADMIN } } as never
  const agent = { id: 'agent-1', role: { code: RoleCode.AGENT } } as never
  const activeUser = {
    id: 'user-1',
    fullName: 'Agente Soporte',
    email: 'agent@helpdesk.com',
    status: UserStatus.ACTIVE,
    role: { code: RoleCode.AGENT, permissions: [] },
  }

  function createService(user: typeof activeUser | null) {
    const manager = {
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: () => ({ set: () => ({ where: () => ({ execute: jest.fn() }) }) }),
      })),
    }
    const service = new UsersService(
      { findOne: jest.fn().mockResolvedValue(user) } as never,
      { findOneBy: jest.fn() } as never,
      { transaction: jest.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)) } as never,
    )
    return { service, manager }
  }

  it('rechaza a roles distintos de ADMIN', async () => {
    const { service } = createService(activeUser)
    await expect(service.resetPassword(activeUser.id, agent)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('devuelve 404 si el usuario no existe', async () => {
    const { service } = createService(null)
    await expect(service.resetPassword('11111111-1111-4111-8111-111111111111', admin)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('devuelve 409 si el usuario está inactivo', async () => {
    const { service } = createService({ ...activeUser, status: UserStatus.INACTIVE })
    await expect(service.resetPassword(activeUser.id, admin)).rejects.toBeInstanceOf(ConflictException)
  })

  it('guarda bcrypt y marca mustChangePassword', async () => {
    const { service, manager } = createService(activeUser)
    const result = await service.resetPassword(activeUser.id, admin)
    expect(result.message).toBe('La contraseña se restableció correctamente.')
    expect(validatePasswordLike(result.temporaryPassword)).toBe(true)
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      activeUser.id,
      expect.objectContaining({ mustChangePassword: true }),
    )
    const hash = manager.update.mock.calls[0][2].passwordHash as string
    expect(hash).not.toBe(result.temporaryPassword)
    expect(await bcrypt.compare(result.temporaryPassword, hash)).toBe(true)
  })
})

function validatePasswordLike(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)
}
