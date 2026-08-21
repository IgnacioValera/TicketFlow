import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray({ message: 'La lista de permisos es obligatoria' })
  @ArrayUnique({ message: 'La lista de permisos no debe contener duplicados' })
  @IsUUID('4', { each: true, message: 'Uno o más identificadores de permiso no son UUID válidos' })
  permissionIds: string[]

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'La versión esperada debe ser un entero' })
  @Min(1, { message: 'La versión esperada debe ser un entero positivo' })
  expectedVersion: number
}

export class UpdateModuleStatusDto {
  @ApiProperty()
  @IsBoolean({ message: 'El estado del módulo debe ser verdadero o falso' })
  isActive: boolean
}

export class PermissionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'El identificador de módulo no es un UUID válido' })
  moduleId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moduleCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string
}
