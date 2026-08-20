import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { Client, ClientStatus, Role, RoleCode, User } from '../database/entities'
import { CLIENT_INACTIVE, CLIENT_NOT_FOUND, REQUESTER_CLIENT_REQUIRED } from './user-client-rules'
import { UsersService } from './users.service'

describe('UsersService vínculo con cliente', () => {
  const usersRepo = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
    findOne: jest.fn(),
  }
  const rolesRepo = { findOneBy: jest.fn() }
  const clientsRepo = { findOne: jest.fn() }
  let service: UsersService

  beforeEach(async () => {
    jest.clearAllMocks()
    usersRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getExists: jest.fn().mockResolvedValue(false),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getMany: jest.fn().mockResolvedValue([]),
    })
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Role), useValue: rolesRepo },
        { provide: getRepositoryToken(Client), useValue: clientsRepo },
        { provide: DataSource, useValue: {} },
      ],
    }).compile()
    service = moduleRef.get(UsersService)
  })

  function role(code: RoleCode): Role {
    return { id: `role-${code}`, code, name: code, description: '', permissionsVersion: 1, permissions: [] } as Role
  }

  function savedUser(partial: Partial<User> & { role: Role; client?: Client | null }) {
    return {
      id: 'user-1',
      fullName: 'Persona',
      email: 'persona@helpdesk.com',
      status: 'ACTIVE',
      mustChangePassword: false,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      client: null,
      ...partial,
    } as User
  }

  it('crea REQUESTER sin cliente con 400', async () => {
    rolesRepo.findOneBy.mockResolvedValue(role(RoleCode.REQUESTER))
    await expect(
      service.create({ fullName: 'Solicitante', email: 'sol@helpdesk.com', password: 'Password1!', role: RoleCode.REQUESTER }),
    ).rejects.toThrow(REQUESTER_CLIENT_REQUIRED)
  })

  it('cliente inexistente produce 404', async () => {
    rolesRepo.findOneBy.mockResolvedValue(role(RoleCode.REQUESTER))
    clientsRepo.findOne.mockResolvedValue(null)
    await expect(
      service.create({
        fullName: 'Solicitante',
        email: 'sol@helpdesk.com',
        password: 'Password1!',
        role: RoleCode.REQUESTER,
        clientId: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toThrow(CLIENT_NOT_FOUND)
  })

  it('cliente inactivo produce 409', async () => {
    rolesRepo.findOneBy.mockResolvedValue(role(RoleCode.REQUESTER))
    clientsRepo.findOne.mockResolvedValue({ id: 'c1', name: 'Acme', status: ClientStatus.INACTIVE } as Client)
    await expect(
      service.create({
        fullName: 'Solicitante',
        email: 'sol@helpdesk.com',
        password: 'Password1!',
        role: RoleCode.REQUESTER,
        clientId: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toThrow(CLIENT_INACTIVE)
  })

  it('crea REQUESTER con cliente activo', async () => {
    const client = { id: 'c1', name: 'Acme Corp', status: ClientStatus.ACTIVE } as Client
    rolesRepo.findOneBy.mockResolvedValue(role(RoleCode.REQUESTER))
    clientsRepo.findOne.mockResolvedValue(client)
    usersRepo.save.mockImplementation(async (user) => savedUser({ ...user, role: role(RoleCode.REQUESTER), client }))
    const created = await service.create({
      fullName: 'Solicitante',
      email: 'sol@helpdesk.com',
      password: 'Password1!',
      role: RoleCode.REQUESTER,
      clientId: '11111111-1111-4111-8111-111111111111',
    })
    expect(created.clientId).toBe('c1')
    expect(created.clientName).toBe('Acme Corp')
    expect(created.role).toBe(RoleCode.REQUESTER)
  })

  it('crea usuario interno sin cliente', async () => {
    rolesRepo.findOneBy.mockResolvedValue(role(RoleCode.AGENT))
    usersRepo.save.mockImplementation(async (user) => savedUser({ ...user, role: role(RoleCode.AGENT), client: null }))
    const created = await service.create({
      fullName: 'Agente',
      email: 'agent.new@helpdesk.com',
      password: 'Password1!',
      role: RoleCode.AGENT,
      clientId: '11111111-1111-4111-8111-111111111111',
    })
    expect(clientsRepo.findOne).not.toHaveBeenCalled()
    expect(created.clientId).toBeNull()
    expect(created.role).toBe(RoleCode.AGENT)
  })

  it('exige cliente al cambiar un interno a solicitante', async () => {
    usersRepo.findOne.mockResolvedValue(savedUser({ role: role(RoleCode.AGENT), client: null }))
    rolesRepo.findOneBy.mockResolvedValue(role(RoleCode.REQUESTER))
    await expect(service.update('user-1', { role: RoleCode.REQUESTER })).rejects.toThrow(REQUESTER_CLIENT_REQUIRED)
  })

  it('elimina la asociación al pasar de solicitante a rol interno', async () => {
    const client = { id: 'c1', name: 'Acme Corp', status: ClientStatus.ACTIVE } as Client
    usersRepo.findOne.mockResolvedValue(savedUser({ role: role(RoleCode.REQUESTER), client }))
    rolesRepo.findOneBy.mockResolvedValue(role(RoleCode.AGENT))
    usersRepo.save.mockImplementation(async (user) => savedUser({ ...user, role: user.role, client: user.client }))
    const updated = await service.update('user-1', { role: RoleCode.AGENT })
    expect(updated.clientId).toBeNull()
    expect(updated.role).toBe(RoleCode.AGENT)
  })
})
