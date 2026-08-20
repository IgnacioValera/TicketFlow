import { Transform, Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator'
import { LIMITS } from '../common/limits'
import { maxLengthMessage, minLengthMessage, requiredMessage, Trim } from '../common/validation'
import { TicketStatus } from '../database/entities'

const REASON_ALWAYS_REQUIRED: TicketStatus[] = [
  TicketStatus.CANCELLED,
  TicketStatus.WAITING_USER,
  TicketStatus.RESOLVED,
  TicketStatus.ESCALATED,
]

export class CreateTicketDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmptyString('El título')
  @MinLength(LIMITS.TICKET_TITLE_MIN, { message: minLengthMessage('El título', LIMITS.TICKET_TITLE_MIN) })
  @MaxLength(LIMITS.TICKET_TITLE, { message: maxLengthMessage('El título', LIMITS.TICKET_TITLE) })
  title: string

  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmptyString('La descripción')
  @MinLength(LIMITS.TICKET_DESCRIPTION_MIN, { message: minLengthMessage('La descripción', LIMITS.TICKET_DESCRIPTION_MIN) })
  @MaxLength(LIMITS.TICKET_DESCRIPTION, { message: maxLengthMessage('La descripción', LIMITS.TICKET_DESCRIPTION) })
  description: string

  @ApiProperty() @IsUUID('4', { message: 'El identificador de categoría no es un UUID válido' }) categoryId: string
  @ApiProperty() @IsUUID('4', { message: 'El identificador de prioridad no es un UUID válido' }) priorityId: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4', { message: 'El identificador de cliente no es un UUID válido' }) clientId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4', { message: 'El identificador de cliente no es un UUID válido' }) companyId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4', { message: 'El identificador de solicitante no es un UUID válido' }) requesterId?: string
}

function IsNotEmptyString(field: string) {
  return MinLength(1, { message: requiredMessage(field) })
}

export class UpdateTicketDto extends PartialType(CreateTicketDto) {}

export class ChangeStatusDto {
  @ApiProperty({ enum: TicketStatus }) @IsEnum(TicketStatus, { message: 'El estado no es válido' }) status: TicketStatus

  @ApiPropertyOptional()
  @ValidateIf((o: ChangeStatusDto) => REASON_ALWAYS_REQUIRED.includes(o.status) || o.reason != null)
  @Trim()
  @IsString()
  @MinLength(1, { message: 'El motivo es obligatorio y no puede contener solo espacios' })
  @MaxLength(LIMITS.REASON, { message: maxLengthMessage('El motivo', LIMITS.REASON) })
  reason?: string
}

export class AssignTicketDto {
  @ApiProperty() @IsUUID('4', { message: 'El identificador de agente no es un UUID válido' }) assigneeId: string
}

export class EscalateTicketDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(LIMITS.ESCALATE_REASON_MIN, { message: minLengthMessage('El motivo de escalamiento', LIMITS.ESCALATE_REASON_MIN) })
  @MaxLength(LIMITS.REASON, { message: maxLengthMessage('El motivo', LIMITS.REASON) })
  reason: string
}

export class CreateCommentDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(LIMITS.COMMENT_BODY_MIN, { message: requiredMessage('El comentario') })
  @MaxLength(LIMITS.COMMENT_BODY, { message: maxLengthMessage('El comentario', LIMITS.COMMENT_BODY) })
  body: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInternal?: boolean
}

export class SubmitSurveyDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) rating: number

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'El comentario de la encuesta no puede contener solo espacios' })
  @MaxLength(LIMITS.SURVEY_COMMENT, { message: maxLengthMessage('El comentario de la encuesta', LIMITS.SURVEY_COMMENT) })
  comment?: string
}

export class TicketsQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) perPage?: number
  @ApiPropertyOptional({ enum: TicketStatus }) @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus
  @ApiPropertyOptional() @IsOptional() @IsUUID('4', { message: 'El identificador de prioridad no es un UUID válido' }) priorityId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4', { message: 'El identificador de categoría no es un UUID válido' }) categoryId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4', { message: 'El identificador de agente no es un UUID válido' }) assigneeId?: string
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(LIMITS.SEARCH, { message: maxLengthMessage('La búsqueda', LIMITS.SEARCH) })
  search?: string
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() unassigned?: boolean
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() mine?: boolean
  @ApiPropertyOptional({ enum: ['overdue', 'warning', 'on_time'] }) @IsOptional() @IsIn(['overdue', 'warning', 'on_time']) slaStatus?: 'overdue' | 'warning' | 'on_time'
  @ApiPropertyOptional({ enum: ['open', 'inProgress', 'resolved', 'closed'] })
  @IsOptional()
  @IsIn(['open', 'inProgress', 'resolved', 'closed'])
  preset?: 'open' | 'inProgress' | 'resolved' | 'closed'
}
