import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import { User } from '../database/entities'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions'
export const ANY_PERMISSIONS_KEY = 'anyPermissions'
export const RequirePermissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions)
export const AnyPermissions = (...permissions: string[]) => SetMetadata(ANY_PERMISSIONS_KEY, permissions)

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => {
  return context.switchToHttp().getRequest<{ user: User }>().user
})
