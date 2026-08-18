import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SatisfactionSurvey, Ticket } from '../database/entities'
import { DashboardController, ReportsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
@Module({
  imports: [TypeOrmModule.forFeature([Ticket, SatisfactionSurvey])],
  controllers: [DashboardController, ReportsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
