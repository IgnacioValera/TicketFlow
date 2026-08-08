import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsHexColor, IsInt, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator'
import { CatalogStatus, CompanyTier, PriorityLevel } from '../database/entities'

export class CatalogQueryDto {
  @ApiPropertyOptional() @IsOptional() page?: number
  @ApiPropertyOptional() @IsOptional() perPage?: number
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string
  @ApiPropertyOptional({ enum: CatalogStatus }) @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus
}
export class CreateCategoryDto {
  @ApiProperty() @IsString() @MinLength(2) name: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
export class UpdateCatalogStatusDto { @ApiProperty({ enum: CatalogStatus }) @IsEnum(CatalogStatus) status: CatalogStatus }
export class CreatePriorityDto {
  @ApiProperty() @IsString() @MinLength(2) name: string
  @ApiProperty({ enum: PriorityLevel }) @IsEnum(PriorityLevel) level: PriorityLevel
  @ApiPropertyOptional() @IsOptional() @IsHexColor() color?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
}
export class UpdatePriorityDto extends PartialType(CreatePriorityDto) {}
export class CreateSlaPolicyDto {
  @ApiProperty() @IsString() @MinLength(2) name: string
  @ApiProperty() @IsUUID() priorityId: string
  @ApiProperty() @IsInt() @IsPositive() responseHours: number
  @ApiProperty() @IsInt() @IsPositive() resolutionHours: number
}
export class UpdateSlaPolicyDto extends PartialType(CreateSlaPolicyDto) {}
export class CompaniesQueryDto extends CatalogQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string
  @ApiPropertyOptional({ enum: CompanyTier }) @IsOptional() @IsEnum(CompanyTier) tier?: CompanyTier
}
export class CreateCompanyDto {
  @ApiProperty() @IsString() name: string
  @ApiProperty() @IsString() industry: string
  @ApiProperty() @IsString() region: string
  @ApiProperty({ enum: CompanyTier }) @IsEnum(CompanyTier) tier: CompanyTier
  @ApiProperty() @IsEmail() contactEmail: string
  @ApiProperty() @IsString() contactPhone: string
}
