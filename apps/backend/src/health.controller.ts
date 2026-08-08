import { Controller, Get } from '@nestjs/common'
import { result } from './common/api'
import { Public } from './common/security'

@Controller('health')
export class HealthController {
  @Public() @Get() check() { return result({ status: 'ok', timestamp: new Date().toISOString() }) }
}
