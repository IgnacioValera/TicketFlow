import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccessModule, Permission, PermissionAudit, Role, User } from '../database/entities'
import { ModulesController, PermissionsController, RolesController } from './access.controller'
import { AccessService } from './access.service'

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, AccessModule, PermissionAudit, User])],
  controllers: [RolesController, PermissionsController, ModulesController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessControlModule {}
