import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService, JwtSignOptions } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import bcrypt from 'bcryptjs'
import { createHash, randomUUID } from 'crypto'
import { IsNull, MoreThan, Repository } from 'typeorm'
import { RefreshToken, User, UserStatus } from '../database/entities'
import { LoginDto } from './dto'

interface TokenPayload { sub: string; role: string; type: 'access' | 'refresh'; jti?: string }

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email.trim() })
      .getOne()

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas')
    }
    if (user.status !== UserStatus.ACTIVE) throw new ForbiddenException('La cuenta se encuentra inactiva')
    user.lastLoginAt = new Date()
    await this.users.save(user)
    return { ...(await this.issueTokens(user)), user: this.serializeUser(user) }
  }

  async refresh(rawToken: string) {
    let payload: TokenPayload
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(rawToken, { secret: this.refreshSecret() })
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado')
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Tipo de token inválido')

    const tokenHash = this.hashToken(rawToken)
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: { role: { permissions: true } } },
    })
    if (!stored || stored.user.id !== payload.sub || stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Refresh token revocado')
    }

    stored.revokedAt = new Date()
    await this.refreshTokens.save(stored)
    return this.issueTokens(stored.user)
  }

  async logout(user: User) {
    await this.refreshTokens.createQueryBuilder().update().set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId: user.id }).execute()
  }

  async validateUser(id: string) {
    const user = await this.users.findOne({ where: { id }, relations: { role: { permissions: true } } })
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Sesión inválida')
    return user
  }

  serializeUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.code,
      status: user.status,
      permissions: (user.role.permissions ?? []).map((permission) => permission.code),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt?.toISOString(),
    }
  }

  private async issueTokens(user: User) {
    const accessPayload: TokenPayload = { sub: user.id, role: user.role.code, type: 'access' }
    const refreshPayload: TokenPayload = { sub: user.id, role: user.role.code, type: 'refresh', jti: randomUUID() }
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.accessSecret(), expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'],
    })
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.refreshSecret(), expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'],
    })
    const decoded = this.jwt.decode(refreshToken) as { exp: number }
    await this.refreshTokens.save(this.refreshTokens.create({
      user, tokenHash: this.hashToken(refreshToken), expiresAt: new Date(decoded.exp * 1000), revokedAt: null,
    }))
    return { accessToken, refreshToken }
  }

  private accessSecret() { return this.config.getOrThrow<string>('JWT_ACCESS_SECRET') }
  private refreshSecret() { return this.config.getOrThrow<string>('JWT_REFRESH_SECRET') }
  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex') }
}
