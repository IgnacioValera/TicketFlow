import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { AppModule } from './app.module'
import { ApiExceptionFilter, ApiResponseInterceptor } from './common/api'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.enableCors({ origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','), credentials: true })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }))
  app.useGlobalInterceptors(new ApiResponseInterceptor())
  app.useGlobalFilters(new ApiExceptionFilter())
  const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'); mkdirSync(uploadDir, { recursive: true }); app.useStaticAssets(uploadDir, { prefix: '/uploads/' })
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TicketFlow API')
    .setDescription('API REST del Sistema de Tickets / Mesa de Ayuda')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'x-ticketflow-integration-key', in: 'header', description: 'Clave de integración para n8n' },
      'n8n-api-key',
    )
    .build()
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig), { swaggerOptions: { persistAuthorization: true } })
  await app.listen(Number(process.env.PORT || 8000), '0.0.0.0')
}
void bootstrap()
