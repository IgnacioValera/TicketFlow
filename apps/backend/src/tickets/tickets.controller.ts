import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { result } from '../common/api'
import { CurrentUser } from '../common/security'
import { User } from '../database/entities'
import { AssignTicketDto, ChangeStatusDto, CreateCommentDto, CreateTicketDto, EscalateTicketDto, SubmitSurveyDto, TicketsQueryDto, UpdateTicketDto } from './dto'
import { TicketsService } from './tickets.service'

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
const storage = diskStorage({
  destination: (_req, _file, callback) => { const directory = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'); mkdirSync(directory, { recursive: true }); callback(null, directory) },
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
})

@ApiTags('Tickets') @ApiBearerAuth() @Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService, private readonly config: ConfigService) {}
  @Get() async list(@Query() query: TicketsQueryDto, @CurrentUser() user: User) { const r = await this.tickets.list(query, user); return result(r.items, 'OK', r.meta) }
  @Post() async create(@Body() dto: CreateTicketDto, @CurrentUser() user: User) { return result(await this.tickets.create(dto, user), 'Ticket creado') }
  @Get(':id') async detail(@Param('id') id: string, @CurrentUser() user: User) { return result(await this.tickets.detail(id, user)) }
  @Put(':id') async update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @CurrentUser() user: User) { return result(await this.tickets.update(id, dto, user), 'Ticket actualizado') }
  @Patch(':id/status') async status(@Param('id') id: string, @Body() dto: ChangeStatusDto, @CurrentUser() user: User) { return result(await this.tickets.changeStatus(id, dto, user), 'Estado actualizado') }
  @Patch(':id/assign') async assign(@Param('id') id: string, @Body() dto: AssignTicketDto, @CurrentUser() user: User) { return result(await this.tickets.assign(id, dto, user), 'Ticket asignado') }
  @Patch(':id/escalate') async escalate(@Param('id') id: string, @Body() dto: EscalateTicketDto, @CurrentUser() user: User) { return result(await this.tickets.escalate(id, dto, user), 'Ticket escalado') }
  @Patch(':id/close') async close(@Param('id') id: string, @CurrentUser() user: User) { return result(await this.tickets.close(id, user), 'Ticket cerrado') }
  @Get(':id/comments') async comments(@Param('id') id: string, @CurrentUser() user: User) { return result(await this.tickets.listComments(id, user)) }
  @Post(':id/comments') async addComment(@Param('id') id: string, @Body() dto: CreateCommentDto, @CurrentUser() user: User) { return result(await this.tickets.addComment(id, dto, user), 'Comentario agregado') }
  @Get(':id/attachments') async attachments(@Param('id') id: string, @CurrentUser() user: User) { return result(await this.tickets.listAttachments(id, user)) }
  @Post(':id/attachments') @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(allowedMimeTypes.has(file.mimetype) ? null : new BadRequestException('Tipo de archivo no permitido'), allowedMimeTypes.has(file.mimetype)) }))
  async upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) { if (!file) throw new BadRequestException('Archivo requerido'); return result(await this.tickets.addAttachment(id, file, user), 'Adjunto subido') }
  @Get(':id/sla') async sla(@Param('id') id: string, @CurrentUser() user: User) { return result(await this.tickets.getSla(id, user)) }
  @Post(':id/survey') async survey(@Param('id') id: string, @Body() dto: SubmitSurveyDto, @CurrentUser() user: User) { return result(await this.tickets.submitSurvey(id, dto, user), 'Encuesta registrada') }
}

@ApiTags('Adjuntos') @ApiBearerAuth() @Controller('attachments')
export class AttachmentsController {
  constructor(private readonly tickets: TicketsService) {}
  @Delete(':id') async remove(@Param('id') id: string, @CurrentUser() user: User) { await this.tickets.deleteAttachment(id, user); return result(null, 'Adjunto eliminado') }
}
