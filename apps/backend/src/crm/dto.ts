import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { LIMITS } from '../common/limits'
import { maxLengthMessage, requiredMessage, Trim } from '../common/validation'
import { OPPORTUNITY_STATUS_FILTERS } from './opportunity-rules'
import {
  ActivityStatus,
  ActivityType,
  ClientSegment,
  ClientStatus,
  CompanyTier,
  OpportunityStage,
  SurveyQuestionType,
  SurveyStatus,
  SurveyTrigger,
} from '../database/entities'

export class CrmPaginationDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) perPage?: number
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.SEARCH) search?: string
}

export class ClientsQueryDto extends CrmPaginationDto {
  @ApiPropertyOptional({ enum: ClientStatus }) @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus
  @ApiPropertyOptional({ enum: ClientSegment }) @IsOptional() @IsEnum(ClientSegment) segment?: ClientSegment
  @ApiPropertyOptional({ enum: CompanyTier }) @IsOptional() @IsEnum(CompanyTier) tier?: CompanyTier
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.CLIENT_INDUSTRY) industry?: string
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.CLIENT_REGION) region?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') ownerId?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) minScore?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) maxScore?: number
}

export class CreateClientDto {
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('El nombre') }) @MaxLength(LIMITS.CLIENT_NAME, { message: maxLengthMessage('El nombre', LIMITS.CLIENT_NAME) }) name: string
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('El giro') }) @MaxLength(LIMITS.CLIENT_INDUSTRY, { message: maxLengthMessage('El giro', LIMITS.CLIENT_INDUSTRY) }) industry: string
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('La región') }) @MaxLength(LIMITS.CLIENT_REGION, { message: maxLengthMessage('La región', LIMITS.CLIENT_REGION) }) region: string
  @ApiProperty({ enum: CompanyTier }) @IsEnum(CompanyTier) tier: CompanyTier
  @ApiProperty({ enum: ClientSegment }) @IsEnum(ClientSegment) segment: ClientSegment
  @ApiProperty() @IsEmail({}, { message: 'El correo no es válido' }) @MaxLength(LIMITS.EMAIL) email: string
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('El teléfono') }) @MaxLength(LIMITS.CLIENT_PHONE, { message: maxLengthMessage('El teléfono', LIMITS.CLIENT_PHONE) }) phone: string
  @ApiPropertyOptional({ enum: ClientStatus }) @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') ownerId?: string
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ContactsQueryDto extends CrmPaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') clientId?: string
}

export class CreateContactDto {
  @ApiProperty() @IsUUID('4') clientId: string
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('El nombre') }) @MaxLength(LIMITS.CONTACT_NAME, { message: maxLengthMessage('El nombre', LIMITS.CONTACT_NAME) }) firstName: string
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('El apellido') }) @MaxLength(LIMITS.CONTACT_NAME, { message: maxLengthMessage('El apellido', LIMITS.CONTACT_NAME) }) lastName: string
  @ApiProperty() @IsEmail({}, { message: 'El correo no es válido' }) @MaxLength(LIMITS.EMAIL) email: string
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.CLIENT_PHONE) phone?: string
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.CONTACT_JOB) jobTitle?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}

export class OpportunitiesQueryDto extends CrmPaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') clientId?: string
  @ApiPropertyOptional({ enum: OpportunityStage }) @IsOptional() @IsEnum(OpportunityStage) stage?: OpportunityStage
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') ownerId?: string
  @ApiPropertyOptional({ enum: OPPORTUNITY_STATUS_FILTERS }) @IsOptional() @IsIn(OPPORTUNITY_STATUS_FILTERS) status?: (typeof OPPORTUNITY_STATUS_FILTERS)[number]
}

export class CreateOpportunityDto {
  @ApiProperty() @IsUUID('4') clientId: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') contactId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') ownerId?: string
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('El título') }) @MaxLength(LIMITS.OPPORTUNITY_TITLE, { message: maxLengthMessage('El título', LIMITS.OPPORTUNITY_TITLE) }) title: string
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) amount: number
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MinLength(3) @MaxLength(3) currency?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) probability?: number
  @ApiPropertyOptional({ enum: OpportunityStage }) @IsOptional() @IsEnum(OpportunityStage) stage?: OpportunityStage
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedCloseDate?: string
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.NOTES) notes?: string
}

export class UpdateOpportunityDto extends PartialType(CreateOpportunityDto) {}

export class ChangeStageDto {
  @ApiProperty({ enum: OpportunityStage }) @IsEnum(OpportunityStage) stage: OpportunityStage
  @ApiPropertyOptional() @ValidateIf((o: ChangeStageDto) => o.stage === OpportunityStage.LOST || o.lostReason != null) @Trim() @IsString() @MinLength(1, { message: requiredMessage('El motivo de pérdida') }) @MaxLength(LIMITS.LOST_REASON) lostReason?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reopen?: boolean
  @ApiPropertyOptional() @ValidateIf((o: ChangeStageDto) => Boolean(o.reopen) || o.reopenReason != null) @Trim() @IsString() @MinLength(1, { message: requiredMessage('El motivo de reapertura') }) @MaxLength(LIMITS.LOST_REASON) reopenReason?: string
}

export class CreateSurveyInvitationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') surveyId?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() confirmRegenerate?: boolean
}

export class ActivitiesQueryDto extends CrmPaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') clientId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') opportunityId?: string
  @ApiPropertyOptional({ enum: ActivityType }) @IsOptional() @IsEnum(ActivityType) type?: ActivityType
  @ApiPropertyOptional({ enum: ActivityStatus }) @IsOptional() @IsEnum(ActivityStatus) status?: ActivityStatus
}

export class CreateActivityDto {
  @ApiProperty() @IsUUID('4') clientId: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') opportunityId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') contactId?: string
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') ownerId?: string
  @ApiProperty({ enum: ActivityType }) @IsEnum(ActivityType) type: ActivityType
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('El asunto') }) @MaxLength(LIMITS.ACTIVITY_SUBJECT, { message: maxLengthMessage('El asunto', LIMITS.ACTIVITY_SUBJECT) }) subject: string
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.ACTIVITY_BODY) body?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueAt?: string
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

export class SurveysQueryDto extends CrmPaginationDto {
  @ApiPropertyOptional({ enum: SurveyStatus }) @IsOptional() @IsEnum(SurveyStatus) status?: SurveyStatus
}

export class CreateSurveyDto {
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('El título') }) @MaxLength(LIMITS.SURVEY_TITLE, { message: maxLengthMessage('El título', LIMITS.SURVEY_TITLE) }) title: string
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.SURVEY_DESCRIPTION, { message: maxLengthMessage('La descripción', LIMITS.SURVEY_DESCRIPTION) }) description?: string
  @ApiPropertyOptional({ enum: SurveyTrigger }) @IsOptional() @IsEnum(SurveyTrigger) trigger?: SurveyTrigger
}

export class UpdateSurveyDto extends PartialType(CreateSurveyDto) {}

export class CreateQuestionOptionDto {
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('La opción') }) @MaxLength(LIMITS.SURVEY_OPTION, { message: maxLengthMessage('La opción', LIMITS.SURVEY_OPTION) }) label: string
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(80) value?: string
}

export class CreateQuestionDto {
  @ApiProperty() @Trim() @IsString() @MinLength(1, { message: requiredMessage('La pregunta') }) @MaxLength(LIMITS.SURVEY_PROMPT, { message: maxLengthMessage('La pregunta', LIMITS.SURVEY_PROMPT) }) prompt: string
  @ApiProperty({ enum: SurveyQuestionType }) @IsEnum(SurveyQuestionType) type: SurveyQuestionType
  @ApiPropertyOptional() @IsOptional() @IsBoolean() required?: boolean
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) position?: number
  @ApiPropertyOptional({ type: [CreateQuestionOptionDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateQuestionOptionDto) options?: CreateQuestionOptionDto[]
}

export class ReorderQuestionsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) questionIds: string[]
}

export class SurveyAnswerDto {
  @ApiProperty() @IsUUID('4') questionId: string
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(LIMITS.SURVEY_DESCRIPTION) textValue?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10) numberValue?: number
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsUUID('4', { each: true }) @ArrayMaxSize(20) optionIds?: string[]
}

export class RespondSurveyDto {
  @ApiProperty({ type: [SurveyAnswerDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => SurveyAnswerDto) answers: SurveyAnswerDto[]
}
