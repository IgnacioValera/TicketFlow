import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnalyticsModule } from './analytics/analytics.module'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard, PermissionsGuard } from './auth/auth.guard'
import { CatalogsModule } from './catalogs/catalogs.module'
import { ENTITIES } from './database/entities'
import { KnowledgeModule } from './knowledge/knowledge.module'
import { TicketsModule } from './tickets/tickets.module'
import { UsersModule } from './users/users.module'
import { HealthController } from './health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ type: 'postgres', host: config.get('DB_HOST', 'localhost'), port: Number(config.get('DB_PORT', 5432)), username: config.get('DB_USERNAME', 'ticketflow'), password: config.get('DB_PASSWORD', 'ticketflow_dev_password'), database: config.get('DB_DATABASE', 'ticketflow'), ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false, entities: ENTITIES, synchronize: false, logging: config.get('DB_LOGGING') === 'true' }) }),
    AuthModule, UsersModule, CatalogsModule, TicketsModule, AnalyticsModule, KnowledgeModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: PermissionsGuard }],
})
export class AppModule {}
