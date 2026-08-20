import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator'
import { requiredMessage, Trim } from '../../common/validation'

const REASON_MAX = 500
const WORKFLOW_ID_MAX = 120

export class N8nAssignTicketDto {
  @ApiProperty()
  @IsUUID('4', { message: 'El identificador de evento no es un UUID válido' })
  eventId: string

  @ApiProperty()
  @IsUUID('4', { message: 'El identificador de agente no es un UUID válido' })
  assigneeId: string

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(1, { message: requiredMessage('El motivo') })
  @MaxLength(REASON_MAX, { message: `El motivo no puede superar ${REASON_MAX} caracteres` })
  reason: string

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'La confianza debe ser un número entre 0 y 1' })
  @Min(0, { message: 'La confianza debe ser un número entre 0 y 1' })
  @Max(1, { message: 'La confianza debe ser un número entre 0 y 1' })
  confidence: number

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(WORKFLOW_ID_MAX, { message: `El identificador de ejecución no puede superar ${WORKFLOW_ID_MAX} caracteres` })
  workflowExecutionId?: string
}

export class N8nAssignmentFailedDto {
  @ApiProperty()
  @IsUUID('4', { message: 'El identificador de evento no es un UUID válido' })
  eventId: string

  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(1, { message: requiredMessage('El motivo') })
  @MaxLength(REASON_MAX, { message: `El motivo no puede superar ${REASON_MAX} caracteres` })
  reason: string

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(WORKFLOW_ID_MAX, { message: `El identificador de ejecución no puede superar ${WORKFLOW_ID_MAX} caracteres` })
  workflowExecutionId?: string
}
