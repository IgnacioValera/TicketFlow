import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator'
import { RoleCode, UserStatus } from '../database/entities'

export class CreateUserDto {
  @ApiProperty() @IsString() @MinLength(3) fullName: string
  @ApiProperty() @IsEmail() email: string
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string
  @ApiProperty({ enum: RoleCode }) @IsEnum(RoleCode) role: RoleCode
}
export class UpdateUserDto extends PartialType(CreateUserDto) {}
export class UpdateUserStatusDto { @ApiProperty({ enum: UserStatus }) @IsEnum(UserStatus) status: UserStatus }
export class UsersQueryDto {
  @ApiPropertyOptional() @IsOptional() page?: number
  @ApiPropertyOptional() @IsOptional() perPage?: number
  @ApiPropertyOptional({ enum: RoleCode }) @IsOptional() @IsEnum(RoleCode) role?: RoleCode
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string
}
export class UserIdDto { @IsUUID() id: string }
