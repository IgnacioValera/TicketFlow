import { Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator'
import { result } from '../common/api'
import { ParseUuidPipe } from '../common/parse-uuid.pipe'
import { CurrentUser } from '../common/security'
import { User } from '../database/entities'
import { NotificationsService } from './notifications.service'

class NotificationsQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) perPage?: number
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() unread?: boolean
}

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get() async list(@Query() query: NotificationsQueryDto, @CurrentUser() user: User) {
    const response = await this.notifications.list(user, query)
    return result(response.items, 'OK', response.meta)
  }

  @Get('unread-count') async unreadCount(@CurrentUser() user: User) {
    return result(await this.notifications.unreadCount(user))
  }

  @Patch('read-all') async readAll(@CurrentUser() user: User) {
    return result(await this.notifications.markAllRead(user), 'Notificaciones actualizadas')
  }

  @Patch(':id/read') async read(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: User) {
    return result(await this.notifications.markRead(id, user), 'Notificación leída')
  }
}
