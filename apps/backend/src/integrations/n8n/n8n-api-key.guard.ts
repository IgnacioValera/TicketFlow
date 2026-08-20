import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { N8N_INTEGRATION_HEADER } from './n8n-assignment-rules'
import { secretsMatch } from './n8n-secrets'

@Injectable()
export class N8nApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const header = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>().headers[N8N_INTEGRATION_HEADER]
    const provided = Array.isArray(header) ? header[0] : header
    const expected = this.config.get<string>('N8N_INTEGRATION_API_KEY')
    if (!secretsMatch(provided, expected)) {
      throw new UnauthorizedException('No autorizado')
    }
    return true
  }
}
