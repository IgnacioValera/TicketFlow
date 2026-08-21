import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { result } from '../common/api'
import { ParseUuidPipe } from '../common/parse-uuid.pipe'
import { AnyPermissions, CurrentUser, RequireRoles } from '../common/security'
import { RoleCode, User } from '../database/entities'
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, UsersQueryDto } from './dto'
import { UsersService } from './users.service'

@ApiTags('Usuarios') @ApiBearerAuth() @Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequireRoles(RoleCode.ADMIN) @Get() async list(@Query() query: UsersQueryDto) {
    const response = await this.users.list(query)
    return result(response.items, 'OK', response.meta)
  }

  @AnyPermissions('TICKET_ASSIGN', 'TICKET_REASSIGN') @Get('assignable') async assignable() {
    return result(await this.users.listAssignable())
  }

  @RequireRoles(RoleCode.ADMIN) @Get('client-options') async clientOptions(@Query() query: UsersQueryDto) {
    const response = await this.users.listClientOptions(query)
    return result(response.items, 'OK', response.meta)
  }

  @RequireRoles(RoleCode.ADMIN, RoleCode.SUPERVISOR) @Get('requesters') async requesters() {
    return result(await this.users.listRequesters())
  }

  @RequireRoles(RoleCode.ADMIN) @Get(':id') async find(@Param('id', ParseUuidPipe) id: string) {
    return result(this.users.serialize(await this.users.find(id)))
  }

  @RequireRoles(RoleCode.ADMIN) @Post() async create(@Body() dto: CreateUserDto) {
    return result(await this.users.create(dto), 'Usuario creado')
  }

  @RequireRoles(RoleCode.ADMIN) @Put(':id') async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateUserDto) {
    return result(await this.users.update(id, dto), 'Usuario actualizado')
  }

  @RequireRoles(RoleCode.ADMIN) @Post(':id/reset-password') async resetPassword(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() actor: User,
  ) {
    const response = await this.users.resetPassword(id, actor)
    return result({ temporaryPassword: response.temporaryPassword }, response.message)
  }

  @RequireRoles(RoleCode.ADMIN) @Patch(':id/status') async status(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: User,
  ) {
    return result(await this.users.setStatus(id, dto.status, actor), 'Estado actualizado')
  }
}
