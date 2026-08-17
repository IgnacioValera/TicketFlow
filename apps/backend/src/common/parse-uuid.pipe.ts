import { BadRequestException, ParseUUIDPipe } from '@nestjs/common'

export class ParseUuidPipe extends ParseUUIDPipe {
  constructor() {
    super({
      version: '4',
      exceptionFactory: () => new BadRequestException('El identificador no es un UUID válido'),
    })
  }
}
