import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Ticket } from '../database/entities'
import { DashboardController, ReportsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
@Module({ imports: [TypeOrmModule.forFeature([Ticket])], controllers: [DashboardController, ReportsController], providers: [AnalyticsService] })
export class AnalyticsModule {}
