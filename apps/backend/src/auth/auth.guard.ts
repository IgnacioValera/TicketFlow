import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import {
  ALLOW_WHILE_PASSWORD_CHANGE_KEY,
  ANY_PERMISSIONS_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
} from '../common/security'
import { User } from '../database/entities'
import { userPermissionCodes } from '../common/effective-permissions'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly config: ConfigService, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user: User }>()
    const raw = request.headers.authorization
    if (!raw?.startsWith('Bearer ')) throw new UnauthorizedException('Token de acceso requerido')
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; type: string }>(raw.slice(7), { secret: this.config.getOrThrow('JWT_ACCESS_SECRET') })
      if (payload.type !== 'access') throw new Error('wrong token type')
      request.user = await this.auth.validateUser(payload.sub)
      return true
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Token de acceso inválido o expirado')
    }
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? []
    const any = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? []
    const roles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [context.getHandler(), context.getClass()]) ?? []
    if (!required.length && !any.length && !roles.length) return true
    const user = context.switchToHttp().getRequest<{ user: User }>().user
    const owned = new Set(userPermissionCodes(user))
    if (roles.length && !roles.includes(user.role.code)) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción')
    }
    if (required.some((permission) => !owned.has(permission)) || (any.length && !any.some((permission) => owned.has(permission)))) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción')
    }
    return true
  }
}

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return true
    }
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_WHILE_PASSWORD_CHANGE_KEY, [context.getHandler(), context.getClass()])) {
      return true
    }
    const user = context.switchToHttp().getRequest<{ user?: User }>().user
    if (user?.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Debes cambiar tu contraseña temporal antes de continuar.',
      })
    }
    return true
  }
}
