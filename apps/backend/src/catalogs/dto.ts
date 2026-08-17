import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import {
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator'
import { LIMITS } from '../common/limits'
import { maxLengthMessage, minLengthMessage, SlaHoursOrderConstraint, Trim } from '../common/validation'
import { CatalogStatus, PriorityLevel } from '../database/entities'

export class CatalogQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() page?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() perPage?: number
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(LIMITS.SEARCH, { message: maxLengthMessage('La búsqueda', LIMITS.SEARCH) })
  search?: string
  @ApiPropertyOptional({ enum: CatalogStatus }) @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus
}

export class CreateCategoryDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(LIMITS.CATEGORY_NAME_MIN, { message: minLengthMessage('El nombre', LIMITS.CATEGORY_NAME_MIN) })
  @MaxLength(LIMITS.CATEGORY_NAME, { message: maxLengthMessage('El nombre', LIMITS.CATEGORY_NAME) })
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'La descripción no puede contener solo espacios' })
  @MaxLength(LIMITS.CATALOG_DESCRIPTION, { message: maxLengthMessage('La descripción', LIMITS.CATALOG_DESCRIPTION) })
  description?: string
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
export class UpdateCatalogStatusDto {
  @ApiProperty({ enum: CatalogStatus }) @IsEnum(CatalogStatus) status: CatalogStatus
}

export class CreatePriorityDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(LIMITS.PRIORITY_NAME_MIN, { message: minLengthMessage('El nombre', LIMITS.PRIORITY_NAME_MIN) })
  @MaxLength(LIMITS.PRIORITY_NAME, { message: maxLengthMessage('El nombre', LIMITS.PRIORITY_NAME) })
  name: string

  @ApiProperty({ enum: PriorityLevel }) @IsEnum(PriorityLevel) level: PriorityLevel

  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor({
    message: 'El color debe tener formato hexadecimal, por ejemplo #2563EB.',
  })
  @MaxLength(LIMITS.PRIORITY_COLOR, { message: maxLengthMessage('El color', LIMITS.PRIORITY_COLOR) })
  color?: string

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'La descripción no puede contener solo espacios' })
  @MaxLength(LIMITS.CATALOG_DESCRIPTION, { message: maxLengthMessage('La descripción', LIMITS.CATALOG_DESCRIPTION) })
  description?: string
}

export class UpdatePriorityDto extends PartialType(CreatePriorityDto) {}

export class CreateSlaPolicyDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(LIMITS.SLA_NAME_MIN, { message: minLengthMessage('El nombre', LIMITS.SLA_NAME_MIN) })
  @MaxLength(LIMITS.SLA_NAME, { message: maxLengthMessage('El nombre', LIMITS.SLA_NAME) })
  name: string

  @ApiProperty() @IsUUID('4', { message: 'El identificador de prioridad no es un UUID válido' }) priorityId: string
  @ApiProperty() @Type(() => Number) @IsInt({ message: 'El tiempo de respuesta debe ser un entero' }) @IsPositive({ message: 'El tiempo de respuesta debe ser positivo' }) responseHours: number
  @ApiProperty() @Type(() => Number) @IsInt({ message: 'El tiempo de resolución debe ser un entero' }) @IsPositive({ message: 'El tiempo de resolución debe ser positivo' }) @Validate(SlaHoursOrderConstraint) resolutionHours: number
}

export class UpdateSlaPolicyDto extends PartialType(CreateSlaPolicyDto) {}

