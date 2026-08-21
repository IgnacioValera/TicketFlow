import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiHeader, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { result } from '../../common/api'
import { ParseUuidPipe } from '../../common/parse-uuid.pipe'
import { Public } from '../../common/security'
import { N8nAssignTicketDto, N8nAssignmentFailedDto } from './dto'
import { N8nApiKeyGuard } from './n8n-api-key.guard'
import { N8N_INTEGRATION_HEADER } from './n8n-assignment-rules'
import { N8nIntegrationService } from './n8n-integration.service'

@ApiTags('Integraciones n8n')
@ApiSecurity('n8n-api-key')
@ApiHeader({ name: N8N_INTEGRATION_HEADER, required: true, description: 'Clave de integración de n8n' })
@Public()
@UseGuards(N8nApiKeyGuard)
@Controller('integrations/n8n/tickets')
export class N8nIntegrationController {
  constructor(private readonly n8n: N8nIntegrationService) {}

  @Get(':ticketId/assignment-context')
  async assignmentContext(@Param('ticketId', ParseUuidPipe) ticketId: string) {
    return result(await this.n8n.assignmentContext(ticketId), 'Contexto de asignación obtenido')
  }

  @Post(':ticketId/assign')
  async assign(@Param('ticketId', ParseUuidPipe) ticketId: string, @Body() dto: N8nAssignTicketDto) {
    return result(await this.n8n.assignByAi(ticketId, dto), 'Decisión de asignación procesada')
  }

  @Post(':ticketId/assignment-failed')
  async assignmentFailed(@Param('ticketId', ParseUuidPipe) ticketId: string, @Body() dto: N8nAssignmentFailedDto) {
    return result(await this.n8n.recordAssignmentFailed(ticketId, dto), 'Fallo de asignación registrado')
  }
}
