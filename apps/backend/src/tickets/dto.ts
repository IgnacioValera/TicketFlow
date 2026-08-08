import { Transform, Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator'
import { TicketStatus } from '../database/entities'

export class CreateTicketDto {
  @ApiProperty() @IsString() @MinLength(4) title: string
  @ApiProperty() @IsString() @MinLength(10) description: string
  @ApiProperty() @IsUUID() categoryId: string
  @ApiProperty() @IsUUID() priorityId: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() companyId?: string
}
export class UpdateTicketDto extends PartialType(CreateTicketDto) {}
export class ChangeStatusDto {
  @ApiProperty({ enum: TicketStatus }) @IsEnum(TicketStatus) status: TicketStatus
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string
}
export class AssignTicketDto { @ApiProperty() @IsUUID() assigneeId: string }
export class EscalateTicketDto { @ApiProperty() @IsString() @MinLength(5) reason: string }
export class CreateCommentDto {
  @ApiProperty() @IsString() @MinLength(1) body: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInternal?: boolean
}
export class SubmitSurveyDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) rating: number
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string
}
export class TicketsQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) perPage?: number
  @ApiPropertyOptional({ enum: TicketStatus }) @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus
  @ApiPropertyOptional() @IsOptional() @IsUUID() priorityId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID() assigneeId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() unassigned?: boolean
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() mine?: boolean
  @ApiPropertyOptional({ enum: ['overdue', 'warning', 'on_time'] }) @IsOptional() @IsIn(['overdue', 'warning', 'on_time']) slaStatus?: 'overdue' | 'warning' | 'on_time'
}
