import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import bcrypt from 'bcryptjs'
import { Brackets, DataSource, Repository } from 'typeorm'
import { parsePagination, pagination } from '../common/api'
import { generateTemporaryPassword } from '../common/password'
import { RefreshToken, Role, RoleCode, User, UserStatus } from '../database/entities'
import { CreateUserDto, UpdateUserDto, UsersQueryDto } from './dto'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  async list(query: UsersQueryDto) {
    const { page, perPage, skip } = parsePagination(query.page, query.perPage)
    const qb = this.users.createQueryBuilder('user').leftJoinAndSelect('user.role', 'role').leftJoinAndSelect('role.permissions', 'permission')
    if (query.role) qb.andWhere('role.code = :role', { role: query.role })
    if (query.status) qb.andWhere('user.status = :status', { status: query.status })
    if (query.search) qb.andWhere(new Brackets((where) => where.where('LOWER(user.fullName) LIKE :q').orWhere('LOWER(user.email) LIKE :q')), { q: `%${query.search.toLowerCase()}%` })
    const [items, total] = await qb.orderBy('user.createdAt', 'DESC').skip(skip).take(perPage).getManyAndCount()
    return { items: items.map((user) => this.serialize(user)), meta: pagination(page, perPage, total) }
  }

  async find(id: string) {
    const user = await this.users.findOne({ where: { id }, relations: { role: { permissions: true } } })
    if (!user) throw new NotFoundException('Usuario no encontrado')
    return user
  }

  async create(dto: CreateUserDto) {
    if (await this.users.exists({ where: { email: dto.email.toLowerCase() } })) throw new ConflictException('El correo ya está registrado')
    const role = await this.roles.findOneBy({ code: dto.role })
    if (!role) throw new NotFoundException('Rol no encontrado')
    const user = this.users.create({
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(dto.password, 12),
      role,
      lastLoginAt: null,
      mustChangePassword: false,
    })
    return this.serialize(await this.users.save(user))
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.find(id)
    if (dto.email && dto.email.toLowerCase() !== user.email && await this.users.exists({ where: { email: dto.email.toLowerCase() } })) throw new ConflictException('El correo ya está registrado')
    if (dto.role) {
      const role = await this.roles.findOneBy({ code: dto.role })
      if (!role) throw new NotFoundException('Rol no encontrado')
      user.role = role
    }
    if (dto.fullName) user.fullName = dto.fullName.trim()
    if (dto.email) user.email = dto.email.toLowerCase().trim()
    return this.serialize(await this.users.save(user))
  }

  async setStatus(id: string, status: User['status'], actor: User) {
    const user = await this.find(id)
    if (id === actor.id && status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('No puedes desactivar o bloquear tu propia cuenta')
    }
    user.status = status
    return this.serialize(await this.users.save(user))
  }

  async resetPassword(id: string, actor: User) {
    if (actor.role.code !== RoleCode.ADMIN) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción')
    }
    const user = await this.find(id)
    if (user.status !== UserStatus.ACTIVE) {
      throw new ConflictException('No se puede restablecer la contraseña de un usuario inactivo')
    }
    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await bcrypt.hash(temporaryPassword, 12)
    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, user.id, { passwordHash, mustChangePassword: true })
      await manager
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: new Date() })
        .where('user_id = :userId AND revoked_at IS NULL', { userId: user.id })
        .execute()
    })
    return { message: 'La contraseña se restableció correctamente.', temporaryPassword }
  }

  serialize(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.code,
      status: user.status,
      permissions: (user.role.permissions ?? []).map((p) => p.code),
      mustChangePassword: Boolean(user.mustChangePassword),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt?.toISOString(),
    }
  }
}
