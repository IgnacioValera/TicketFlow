import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Category, Client, Priority, SatisfactionSurvey, SlaPolicy, Ticket, TicketAttachment, TicketComment, TicketCounter, TicketHistory, User } from '../database/entities'
import { AttachmentsController, TicketsController } from './tickets.controller'
import { TicketsService } from './tickets.service'
@Module({ imports: [TypeOrmModule.forFeature([Ticket, Category, Priority, SlaPolicy, Client, User, TicketComment, TicketAttachment, TicketHistory, SatisfactionSurvey, TicketCounter])], controllers: [TicketsController, AttachmentsController], providers: [TicketsService], exports: [TicketsService] })
export class TicketsModule {}
