import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'
import { LIMITS } from '../common/limits'
import { IsPasswordPolicy, maxLengthMessage, minLengthMessage, NormalizeEmail, Trim } from '../common/validation'

export class LoginDto {
  @ApiProperty({ example: 'admin@helpdesk.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(LIMITS.EMAIL, { message: maxLengthMessage('El correo', LIMITS.EMAIL) })
  email: string

  @ApiProperty({ example: 'password' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string
}

export class RefreshDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'El refresh token es obligatorio' }) refreshToken: string
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  currentPassword: string

  @ApiProperty()
  @IsString()
  @IsPasswordPolicy()
  newPassword: string
}

export class UpdateOwnProfileDto {
  @ApiProperty({ example: 'Admin Sistema' })
  @Trim()
  @IsString()
  @MinLength(LIMITS.USER_FULL_NAME_MIN, { message: minLengthMessage('El nombre', LIMITS.USER_FULL_NAME_MIN) })
  @MaxLength(LIMITS.USER_FULL_NAME, { message: maxLengthMessage('El nombre', LIMITS.USER_FULL_NAME) })
  fullName: string
}
