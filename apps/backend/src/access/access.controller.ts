import { Body, Controller, Get, Param, Patch, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { result } from '../common/api'
import { ParseUuidPipe } from '../common/parse-uuid.pipe'
import { PERMISSIONS } from '../common/permissions'
import { AnyPermissions, CurrentUser, RequirePermissions } from '../common/security'
import { User } from '../database/entities'
import { AccessService } from './access.service'
import { PermissionsQueryDto, UpdateModuleStatusDto, UpdateRolePermissionsDto } from './dto'

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly access: AccessService) {}

  @AnyPermissions(PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_PERMISSION_MANAGE)
  @Get()
  async list() {
    return result(await this.access.listRoles())
  }

  @AnyPermissions(PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_PERMISSION_MANAGE, PERMISSIONS.PERMISSION_AUDIT_VIEW)
  @Get(':id/permissions/audit')
  async audit(@Param('id', ParseUuidPipe) id: string) {
    return result(await this.access.listRoleAudit(id))
  }

  @AnyPermissions(PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_PERMISSION_MANAGE)
  @Get(':id/permissions')
  async permissions(@Param('id', ParseUuidPipe) id: string) {
    return result(await this.access.getRolePermissions(id))
  }

  @RequirePermissions(PERMISSIONS.ROLE_PERMISSION_MANAGE)
  @Put(':id/permissions')
  async updatePermissions(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() actor: User,
  ) {
    return result(await this.access.updateRolePermissions(id, dto, actor), 'Privilegios actualizados')
  }
}

@ApiTags('Permisos')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly access: AccessService) {}

  @AnyPermissions(PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_PERMISSION_MANAGE)
  @Get()
  async list(@Query() query: PermissionsQueryDto) {
    return result(await this.access.listPermissions(query))
  }
}

@ApiTags('Módulos')
@ApiBearerAuth()
@Controller('modules')
export class ModulesController {
  constructor(private readonly access: AccessService) {}

  @AnyPermissions(PERMISSIONS.MODULE_VIEW, PERMISSIONS.ROLE_PERMISSION_MANAGE, PERMISSIONS.MODULE_MANAGE)
  @Get()
  async list() {
    return result(await this.access.listModules())
  }

  @AnyPermissions(PERMISSIONS.PERMISSION_AUDIT_VIEW, PERMISSIONS.ROLE_PERMISSION_MANAGE, PERMISSIONS.MODULE_VIEW)
  @Get('audit')
  async audit() {
    return result(await this.access.listModuleAudit())
  }

  @RequirePermissions(PERMISSIONS.MODULE_MANAGE)
  @Patch(':id/status')
  async status(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateModuleStatusDto,
    @CurrentUser() actor: User,
  ) {
    return result(await this.access.updateModuleStatus(id, dto, actor), 'Estado del módulo actualizado')
  }
}
