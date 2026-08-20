import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnalyticsModule } from './analytics/analytics.module'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard, MustChangePasswordGuard, PermissionsGuard } from './auth/auth.guard'
import { CatalogsModule } from './catalogs/catalogs.module'
import { CrmModule } from './crm/crm.module'
import { buildTypeOrmOptions } from './database/typeorm.config'
import { KnowledgeModule } from './knowledge/knowledge.module'
import { NotificationsModule } from './notifications/notifications.module'
import { TicketsModule } from './tickets/tickets.module'
import { UsersModule } from './users/users.module'
import { HealthController } from './health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => buildTypeOrmOptions(config) }),
    AuthModule, UsersModule, CatalogsModule, TicketsModule, AnalyticsModule, KnowledgeModule, CrmModule, NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangePasswordGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
