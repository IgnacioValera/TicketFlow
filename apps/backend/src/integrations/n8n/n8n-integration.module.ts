import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Ticket, TicketHistory, User } from '../../database/entities'
import { NotificationsModule } from '../../notifications/notifications.module'
import { N8nApiKeyGuard } from './n8n-api-key.guard'
import { N8nIntegrationController } from './n8n-integration.controller'
import { N8nIntegrationService } from './n8n-integration.service'

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketHistory, User]), NotificationsModule],
  controllers: [N8nIntegrationController],
  providers: [N8nIntegrationService, N8nApiKeyGuard],
  exports: [N8nIntegrationService],
})
export class N8nIntegrationModule {}
