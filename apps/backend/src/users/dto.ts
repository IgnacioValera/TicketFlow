import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'
import { LIMITS } from '../common/limits'
import { IsPasswordPolicy, maxLengthMessage, minLengthMessage, NormalizeEmail, requiredMessage, Trim } from '../common/validation'
import { RoleCode, UserStatus } from '../database/entities'

export const MANAGED_USER_ROLES = [RoleCode.ADMIN, RoleCode.SUPERVISOR, RoleCode.AGENT, RoleCode.REQUESTER] as const
export type ManagedUserRole = (typeof MANAGED_USER_ROLES)[number]

export const DUPLICATE_EMAIL_MESSAGE = 'Ya existe un usuario registrado con ese correo electrónico.'

export class CreateUserDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: requiredMessage('El nombre') })
  @MinLength(LIMITS.USER_FULL_NAME_MIN, { message: minLengthMessage('El nombre', LIMITS.USER_FULL_NAME_MIN) })
  @MaxLength(LIMITS.USER_FULL_NAME, { message: maxLengthMessage('El nombre', LIMITS.USER_FULL_NAME) })
  fullName: string

  @ApiProperty()
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(LIMITS.EMAIL, { message: maxLengthMessage('El correo', LIMITS.EMAIL) })
  email: string

  @ApiProperty({ minLength: LIMITS.PASSWORD_MIN_CHARS })
  @IsString()
  @IsPasswordPolicy()
  password: string

  @ApiProperty({ enum: MANAGED_USER_ROLES })
  @IsIn(MANAGED_USER_ROLES, { message: 'El rol no es válido' })
  role: ManagedUserRole

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'El identificador de cliente no es un UUID válido' })
  clientId?: string
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(LIMITS.USER_FULL_NAME_MIN, { message: minLengthMessage('El nombre', LIMITS.USER_FULL_NAME_MIN) })
  @MaxLength(LIMITS.USER_FULL_NAME, { message: maxLengthMessage('El nombre', LIMITS.USER_FULL_NAME) })
  fullName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(LIMITS.EMAIL, { message: maxLengthMessage('El correo', LIMITS.EMAIL) })
  email?: string

  @ApiPropertyOptional({ enum: MANAGED_USER_ROLES })
  @IsOptional()
  @IsIn(MANAGED_USER_ROLES, { message: 'El rol no es válido' })
  role?: ManagedUserRole

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'El identificador de cliente no es un UUID válido' })
  clientId?: string
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus }) @IsEnum(UserStatus) status: UserStatus
}

export class UsersQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() page?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() perPage?: number
  @ApiPropertyOptional({ enum: RoleCode }) @IsOptional() @IsEnum(RoleCode) role?: RoleCode
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(LIMITS.SEARCH, { message: maxLengthMessage('La búsqueda', LIMITS.SEARCH) })
  search?: string
}
