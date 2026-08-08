import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsDateString, IsIn, IsOptional } from 'class-validator'
import { result } from '../common/api'
import { AnyPermissions, CurrentUser } from '../common/security'
import { User } from '../database/entities'
import { AnalyticsService } from './analytics.service'

class DashboardQuery { @IsOptional() @IsIn(['GLOBAL', 'OWN']) scope?: 'GLOBAL' | 'OWN' }
class DateRangeQuery { @IsOptional() @IsDateString() startDate?: string; @IsOptional() @IsDateString() endDate?: string }

@ApiTags('Dashboard') @ApiBearerAuth() @AnyPermissions('DASHBOARD_VIEW', 'DASHBOARD_VIEW_LIMITED') @Controller('dashboard')
export class DashboardController { constructor(private readonly analytics: AnalyticsService) {} @Get('summary') async summary(@CurrentUser() user: User, @Query() query: DashboardQuery) { return result(await this.analytics.dashboard(user, query.scope)) } }

@ApiTags('Reportes') @ApiBearerAuth() @AnyPermissions('REPORT_VIEW', 'REPORT_VIEW_LIMITED') @Controller('reports')
export class ReportsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('tickets-by-status') async status(@CurrentUser() user: User) { return result(await this.analytics.byStatus(user)) }
  @Get('tickets-by-agent') async agent(@CurrentUser() user: User) { return result(await this.analytics.byAgent(user)) }
  @Get('tickets-by-category') async category(@CurrentUser() user: User) { return result(await this.analytics.byCategory(user)) }
  @Get('sla-compliance') async sla(@CurrentUser() user: User, @Query() query: DateRangeQuery) { return result(await this.analytics.slaCompliance(user, query.startDate, query.endDate)) }
  @Get('tickets-by-company') async company(@CurrentUser() user: User) { return result(await this.analytics.byCompany(user)) }
}
