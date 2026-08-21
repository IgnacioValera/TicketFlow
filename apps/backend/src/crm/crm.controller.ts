import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, StreamableFile } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { result } from '../common/api'
import { ParseUuidPipe } from '../common/parse-uuid.pipe'
import { CurrentUser, Public, RequirePermissions } from '../common/security'
import { User } from '../database/entities'
import { ActivitiesService } from './activities.service'
import { ClientsService } from './clients.service'
import { ContactsService } from './contacts.service'
import { CrmDashboardService } from './dashboard.service'
import {
  ActivitiesQueryDto,
  ChangeStageDto,
  ClientsQueryDto,
  ContactsQueryDto,
  CreateActivityDto,
  CreateClientDto,
  CreateContactDto,
  CreateOpportunityDto,
  CreateQuestionDto,
  CreateSurveyDto,
  CreateSurveyInvitationDto,
  OpportunitiesQueryDto,
  ReorderQuestionsDto,
  RespondSurveyDto,
  SurveysQueryDto,
  UpdateActivityDto,
  UpdateClientDto,
  UpdateContactDto,
  UpdateOpportunityDto,
  UpdateSurveyDto,
} from './dto'
import { OpportunitiesService } from './opportunities.service'
import { SurveysService } from './surveys.service'

function csvFile(content: string, filename: string) {
  return new StreamableFile(Buffer.from(content, 'utf8'), { type: 'text/csv; charset=utf-8', disposition: `attachment; filename="${filename}"` })
}

@ApiBearerAuth() @ApiTags('CRM Clientes') @Controller('crm/clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}
  @RequirePermissions('CRM_CLIENT_VIEW') @Get() async list(@Query() query: ClientsQueryDto, @CurrentUser() user: User) { const r = await this.service.list(query, user); return result(r.items, 'OK', r.meta) }
  @RequirePermissions('CRM_EXPORT') @Get('export') @Header('Content-Type', 'text/csv; charset=utf-8') async export(@Query() query: ClientsQueryDto, @CurrentUser() user: User) { return csvFile(await this.service.exportCsv(query, user), 'clientes.csv') }
  @RequirePermissions('CRM_CLIENT_CREATE') @Post() async create(@Body() dto: CreateClientDto, @CurrentUser() user: User) { return result(await this.service.create(dto, user), 'Cliente creado') }
  @RequirePermissions('CRM_CLIENT_VIEW') @Get(':id/360') async customer360(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) { return result(await this.service.customer360(id, user)) }
  @RequirePermissions('CRM_CLIENT_EDIT') @Post(':id/recalculate-score') async score(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) { return result(await this.service.recalculateScore(id, user), 'Score recalculado') }
  @RequirePermissions('CRM_CLIENT_VIEW') @Get(':id') async find(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) { return result(await this.service.detail(id, user)) }
  @RequirePermissions('CRM_CLIENT_EDIT') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: User) { return result(await this.service.update(id, dto, user), 'Cliente actualizado') }
  @RequirePermissions('CRM_CLIENT_EDIT') @Delete(':id') async remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) { return result(await this.service.remove(id, user), 'Cliente desactivado') }
}

@ApiBearerAuth() @ApiTags('CRM Contactos') @Controller('crm/contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}
  @RequirePermissions('CRM_CONTACT_VIEW') @Get() async list(@Query() query: ContactsQueryDto, @CurrentUser() user: User) { const r = await this.service.list(query, user); return result(r.items, 'OK', r.meta) }
  @RequirePermissions('CRM_EXPORT') @Get('export') @Header('Content-Type', 'text/csv; charset=utf-8') async export(@Query() query: ContactsQueryDto, @CurrentUser() user: User) { return csvFile(await this.service.exportCsv(query, user), 'contactos.csv') }
  @RequirePermissions('CRM_CONTACT_CREATE') @Post() async create(@Body() dto: CreateContactDto, @CurrentUser() user: User) { return result(await this.service.create(dto, user), 'Contacto creado') }
  @RequirePermissions('CRM_CONTACT_EDIT') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateContactDto, @CurrentUser() user: User) { return result(await this.service.update(id, dto, user), 'Contacto actualizado') }
  @RequirePermissions('CRM_CONTACT_DELETE') @Delete(':id') async remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) { return result(await this.service.remove(id, user), 'Contacto eliminado') }
}

@ApiBearerAuth() @ApiTags('CRM Oportunidades') @Controller('crm/opportunities')
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}
  @RequirePermissions('CRM_OPPORTUNITY_VIEW') @Get() async list(@Query() query: OpportunitiesQueryDto, @CurrentUser() user: User) { const r = await this.service.list(query, user); return result(r.items, 'OK', r.meta) }
  @RequirePermissions('CRM_EXPORT') @Get('export') @Header('Content-Type', 'text/csv; charset=utf-8') async export(@Query() query: OpportunitiesQueryDto, @CurrentUser() user: User) { return csvFile(await this.service.exportCsv(query, user), 'oportunidades.csv') }
  @RequirePermissions('CRM_OPPORTUNITY_VIEW') @Get(':id') async find(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) { return result(await this.service.getById(id, user)) }
  @RequirePermissions('CRM_OPPORTUNITY_CREATE') @Post() async create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: User) { return result(await this.service.create(dto, user), 'Oportunidad creada') }
  @RequirePermissions('CRM_OPPORTUNITY_MOVE') @Patch(':id/stage') async stage(@Param('id', ParseUuidPipe) id: string, @Body() dto: ChangeStageDto, @CurrentUser() user: User) { return result(await this.service.changeStage(id, dto, user), 'Etapa actualizada') }
  @RequirePermissions('CRM_OPPORTUNITY_MOVE') @Post(':id/survey-invitation') async createInvitation(@Param('id', ParseUuidPipe) id: string, @Body() dto: CreateSurveyInvitationDto, @CurrentUser() user: User) { return result(await this.service.createSurveyInvitation(id, dto, user), 'Enlace generado') }
  @RequirePermissions('CRM_OPPORTUNITY_MOVE') @Post(':id/survey-links/:surveyId') async copyLink(@Param('id', ParseUuidPipe) id: string, @Param('surveyId', ParseUuidPipe) surveyId: string, @CurrentUser() user: User) { return result(await this.service.copyInvitationLink(id, surveyId, user), 'Enlace generado') }
  @RequirePermissions('CRM_OPPORTUNITY_EDIT') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateOpportunityDto, @CurrentUser() user: User) { return result(await this.service.update(id, dto, user), 'Oportunidad actualizada') }
}

@ApiBearerAuth() @ApiTags('CRM Actividades') @Controller('crm/activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}
  @RequirePermissions('CRM_ACTIVITY_VIEW') @Get() async list(@Query() query: ActivitiesQueryDto, @CurrentUser() user: User) { const r = await this.service.list(query, user); return result(r.items, 'OK', r.meta) }
  @RequirePermissions('CRM_ACTIVITY_CREATE') @Post() async create(@Body() dto: CreateActivityDto, @CurrentUser() user: User) { return result(await this.service.create(dto, user), 'Actividad creada') }
  @RequirePermissions('CRM_ACTIVITY_EDIT') @Patch(':id/complete') async complete(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) { return result(await this.service.complete(id, user), 'Actividad completada') }
  @RequirePermissions('CRM_ACTIVITY_EDIT') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateActivityDto, @CurrentUser() user: User) { return result(await this.service.update(id, dto, user), 'Actividad actualizada') }
}

@ApiBearerAuth() @ApiTags('CRM Encuestas') @Controller('crm/surveys')
export class SurveysController {
  constructor(private readonly service: SurveysService) {}
  @RequirePermissions('CRM_SURVEY_VIEW') @Get() async list(@Query() query: SurveysQueryDto) { const r = await this.service.list(query); return result(r.items, 'OK', r.meta) }
  @RequirePermissions('CRM_SURVEY_MANAGE') @Post() async create(@Body() dto: CreateSurveyDto, @CurrentUser() user: User) { return result(await this.service.create(dto, user), 'Encuesta creada') }
  @RequirePermissions('CRM_SURVEY_RESULTS') @Get(':id/results') async results(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) { return result(await this.service.results(id, user)) }
  @RequirePermissions('CRM_SURVEY_VIEW') @Get(':id') async find(@Param('id', ParseUuidPipe) id: string) { return result(await this.service.getById(id)) }
  @RequirePermissions('CRM_SURVEY_MANAGE') @Post(':id/publish') async publish(@Param('id', ParseUuidPipe) id: string) { return result(await this.service.publish(id), 'Encuesta activada') }
  @RequirePermissions('CRM_SURVEY_MANAGE') @Post(':id/close') async close(@Param('id', ParseUuidPipe) id: string) { return result(await this.service.close(id), 'Encuesta desactivada') }
  @RequirePermissions('CRM_SURVEY_MANAGE') @Post(':id/questions') async addQuestion(@Param('id', ParseUuidPipe) id: string, @Body() dto: CreateQuestionDto) { return result(await this.service.addQuestion(id, dto), 'Pregunta agregada') }
  @RequirePermissions('CRM_SURVEY_MANAGE') @Put(':id/questions/order') async reorder(@Param('id', ParseUuidPipe) id: string, @Body() dto: ReorderQuestionsDto) { return result(await this.service.reorderQuestions(id, dto), 'Orden actualizado') }
  @RequirePermissions('CRM_SURVEY_MANAGE') @Delete(':id/questions/:questionId') async removeQuestion(@Param('id', ParseUuidPipe) id: string, @Param('questionId', ParseUuidPipe) questionId: string) { return result(await this.service.removeQuestion(id, questionId), 'Pregunta eliminada') }
  @RequirePermissions('CRM_SURVEY_MANAGE') @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateSurveyDto) { return result(await this.service.update(id, dto), 'Encuesta actualizada') }
}

@ApiTags('Encuestas públicas') @Controller('public/surveys')
export class PublicSurveysController {
  constructor(private readonly service: SurveysService) {}
  @Public() @Get(':token') async form(@Param('token') token: string) { return result(await this.service.publicForm(token)) }
  @Public() @Post(':token/respond') async respond(@Param('token') token: string, @Body() dto: RespondSurveyDto) { return result(await this.service.respond(token, dto), 'Respuesta registrada') }
}

@ApiBearerAuth() @ApiTags('CRM Dashboard') @Controller('crm/dashboard')
export class CrmDashboardController {
  constructor(private readonly service: CrmDashboardService) {}
  @RequirePermissions('CRM_DASHBOARD') @Get() async get(@CurrentUser() user: User) { return result(await this.service.get(user)) }
}
