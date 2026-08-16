import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { LIMITS } from '../common/limits'
import { maxLengthMessage, Trim } from '../common/validation'

export class LoginDto {
  @ApiProperty({ example: 'admin@helpdesk.com' })
  @Trim()
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
