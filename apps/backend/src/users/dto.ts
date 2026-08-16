import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { LIMITS } from '../common/limits'
import { IsPasswordPolicy, maxLengthMessage, minLengthMessage, Trim } from '../common/validation'
import { RoleCode, UserStatus } from '../database/entities'

export class CreateUserDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(LIMITS.USER_FULL_NAME_MIN, { message: minLengthMessage('El nombre', LIMITS.USER_FULL_NAME_MIN) })
  @MaxLength(LIMITS.USER_FULL_NAME, { message: maxLengthMessage('El nombre', LIMITS.USER_FULL_NAME) })
  fullName: string

  @ApiProperty()
  @Trim()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(LIMITS.EMAIL, { message: maxLengthMessage('El correo', LIMITS.EMAIL) })
  email: string

  @ApiProperty({ minLength: LIMITS.PASSWORD_MIN_CHARS })
  @IsString()
  @IsPasswordPolicy()
  password: string

  @ApiProperty({ enum: RoleCode }) @IsEnum(RoleCode) role: RoleCode
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
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
