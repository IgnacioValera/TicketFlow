import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { PERMISSIONS } from '../common/permissions'
import {
  AccessModule,
  Permission,
  PermissionAudit,
  Role,
  User,
  UserStatus,
} from '../database/entities'
import {
  AUDIT_LOCKOUT_PREVENTED,
  AUDIT_MODULE_ACTIVATE,
  AUDIT_MODULE_DEACTIVATE,
  AUDIT_ROLE_PERMISSIONS_UPDATE,
  MODULE_NOT_FOUND_MESSAGE,
  ROLE_NOT_FOUND_MESSAGE,
  STALE_PERMISSIONS_VERSION_MESSAGE,
  UNKNOWN_PERMISSIONS_MESSAGE,
  assertCanAssignRolePermissions,
  assertCanDeactivateModule,
  diffPermissionCodes,
  uniqueIds,
} from './access-rules'
import { PermissionsQueryDto, UpdateModuleStatusDto, UpdateRolePermissionsDto } from './dto'

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectRepository(AccessModule) private readonly modules: Repository<AccessModule>,
    @InjectRepository(PermissionAudit) private readonly audits: Repository<PermissionAudit>,
    private readonly dataSource: DataSource,
  ) {}

  async listRoles() {
    const rows = await this.roles
      .createQueryBuilder('role')
      .leftJoin('users', 'user', 'user.role_id = role.id')
      .leftJoin('role_permissions', 'rp', 'rp.role_id = role.id')
      .select('role.id', 'id')
      .addSelect('role.code', 'code')
      .addSelect('role.name', 'name')
      .addSelect('role.description', 'description')
      .addSelect('role.permissions_version', 'permissionsVersion')
      .addSelect('COUNT(DISTINCT user.id)', 'userCount')
      .addSelect('COUNT(DISTINCT rp.permission_id)', 'permissionCount')
      .groupBy('role.id')
      .addGroupBy('role.code')
      .addGroupBy('role.name')
      .addGroupBy('role.description')
      .addGroupBy('role.permissions_version')
      .orderBy('role.name', 'ASC')
      .getRawMany<{
        id: string
        code: string
        name: string
        description: string
        permissionsVersion: string
        userCount: string
        permissionCount: string
      }>()

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      userCount: Number(row.userCount),
      permissionCount: Number(row.permissionCount),
      permissionsVersion: Number(row.permissionsVersion),
    }))
  }

  async listPermissions(query: PermissionsQueryDto) {
    const qb = this.permissions
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.module', 'module')
      .orderBy('module.sortOrder', 'ASC')
      .addOrderBy('permission.name', 'ASC')
    if (query.moduleId) qb.andWhere('module.id = :moduleId', { moduleId: query.moduleId })
    if (query.moduleCode) qb.andWhere('module.code = :moduleCode', { moduleCode: query.moduleCode.trim().toUpperCase() })
    if (query.action) qb.andWhere('permission.action = :action', { action: query.action.trim().toUpperCase() })
    const items = await qb.getMany()
    return items.map((permission) => this.serializePermission(permission))
  }

  async listModules() {
    const modules = await this.modules.find({ order: { sortOrder: 'ASC', name: 'ASC' } })
    return modules.map((module) => this.serializeModule(module))
  }

  async getRolePermissions(roleId: string) {
    const role = await this.requireRole(roleId)
    const assigned = new Set((role.permissions ?? []).map((permission) => permission.id))
    const modules = await this.modules.find({
      relations: { permissions: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
    return {
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description ?? '',
        permissionsVersion: role.permissionsVersion,
      },
      modules: modules
        .map((module) => ({
          ...this.serializeModule(module),
          permissions: [...(module.permissions ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            .map((permission) => ({
              id: permission.id,
              code: permission.code,
              name: permission.name,
              description: permission.description,
              action: permission.action,
              assigned: assigned.has(permission.id),
            })),
        }))
        .filter((module) => module.permissions.length > 0 || module.code === 'NOTIFICATIONS' || module.code === 'ADMINISTRATION'),
    }
  }

  async updateRolePermissions(roleId: string, dto: UpdateRolePermissionsDto, actor: User) {
    const permissionIds = uniqueIds(dto.permissionIds)
    const lockoutRef: {
      current: {
        previousPermissions: string[]
        newPermissions: string[]
        addedPermissions: string[]
        removedPermissions: string[]
      } | null
    } = { current: null }

    try {
      await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .createQueryBuilder(Role, 'role')
        .setLock('pessimistic_write')
        .where('role.id = :id', { id: roleId })
        .getOne()
      if (!locked) throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE)

      const withPermissions = await manager.findOne(Role, {
        where: { id: roleId },
        relations: { permissions: true },
      })
      if (!withPermissions) throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE)
      if (withPermissions.permissionsVersion !== dto.expectedVersion || locked.permissionsVersion !== dto.expectedVersion) {
        throw new ConflictException(STALE_PERMISSIONS_VERSION_MESSAGE)
      }

      const selected = permissionIds.length
        ? await manager.find(Permission, { where: { id: In(permissionIds) }, relations: { module: true } })
        : []
      if (selected.length !== permissionIds.length) {
        throw new NotFoundException(UNKNOWN_PERMISSIONS_MESSAGE)
      }

      const previousCodes = (withPermissions.permissions ?? []).map((permission) => permission.code).sort()
      const nextCodes = selected.map((permission) => permission.code).sort()
      const diff = diffPermissionCodes(previousCodes, nextCodes)

      const allRoles = await manager.find(Role, { relations: { permissions: true } })
      const rolesWithManage = allRoles.filter((role) =>
        (role.permissions ?? []).some((permission) => permission.code === PERMISSIONS.ROLE_PERMISSION_MANAGE),
      )
      const activeUsers = await manager.find(User, {
        where: { status: UserStatus.ACTIVE },
        relations: { role: { permissions: true } },
      })
      const activeUsersWithManage = activeUsers.filter((user) =>
        (user.role.permissions ?? []).some((permission) => permission.code === PERMISSIONS.ROLE_PERMISSION_MANAGE),
      )

      try {
        assertCanAssignRolePermissions({
          targetRole: withPermissions,
          nextCodes,
          rolesWithManage,
          activeUsersWithManage,
          actor,
        })
      } catch (error) {
        lockoutRef.current = {
          previousPermissions: previousCodes,
          newPermissions: nextCodes,
          addedPermissions: diff.added,
          removedPermissions: diff.removed,
        }
        throw error
      }

      withPermissions.permissions = selected
      withPermissions.permissionsVersion = withPermissions.permissionsVersion + 1
      await manager.save(withPermissions)
      await manager.save(
        manager.create(PermissionAudit, {
          actor: { id: actor.id } as User,
          targetRole: { id: withPermissions.id } as Role,
          action: AUDIT_ROLE_PERMISSIONS_UPDATE,
          previousPermissions: previousCodes,
          newPermissions: nextCodes,
          addedPermissions: diff.added,
          removedPermissions: diff.removed,
        }),
      )
    })
    } catch (error) {
      if (lockoutRef.current) {
        await this.audits.save(
          this.audits.create({
            actor: { id: actor.id } as User,
            targetRole: { id: roleId } as Role,
            action: AUDIT_LOCKOUT_PREVENTED,
            previousPermissions: lockoutRef.current.previousPermissions,
            newPermissions: lockoutRef.current.newPermissions,
            addedPermissions: lockoutRef.current.addedPermissions,
            removedPermissions: lockoutRef.current.removedPermissions,
          }),
        )
      }
      throw error
    }

    return this.getRolePermissions(roleId)
  }

  async listRoleAudit(roleId: string) {
    await this.requireRole(roleId)
    const items = await this.audits.find({
      where: { targetRole: { id: roleId } },
      relations: { actor: true, targetRole: true, targetModule: true },
      order: { createdAt: 'DESC' },
      take: 100,
    })
    return items.map((item) => this.serializeAudit(item))
  }

  async listModuleAudit() {
    const items = await this.audits
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .leftJoinAndSelect('audit.targetModule', 'module')
      .where('audit.target_module_id IS NOT NULL')
      .orderBy('audit.createdAt', 'DESC')
      .take(100)
      .getMany()
    return items.map((item) => this.serializeAudit(item))
  }

  async updateModuleStatus(moduleId: string, dto: UpdateModuleStatusDto, actor: User) {
    let lockout = false
    const snapshotRef: { current: { previous: string[]; next: string[] } | null } = { current: null }
    let savedModule: AccessModule | null = null

    try {
      savedModule = await this.dataSource.transaction(async (manager) => {
        const module = await manager
          .createQueryBuilder(AccessModule, 'module')
          .setLock('pessimistic_write')
          .where('module.id = :id', { id: moduleId })
          .getOne()
        if (!module) throw new NotFoundException(MODULE_NOT_FOUND_MESSAGE)

        if (module.isActive === dto.isActive) {
          return module
        }

        const recorded = {
          previous: [module.isActive ? 'ACTIVE' : 'INACTIVE'],
          next: [dto.isActive ? 'ACTIVE' : 'INACTIVE'],
        }
        snapshotRef.current = recorded

        if (!dto.isActive) {
          try {
            assertCanDeactivateModule(module)
          } catch (error) {
            lockout = true
            throw error
          }
        }

        module.isActive = dto.isActive
        const saved = await manager.save(module)
        await manager.save(
          manager.create(PermissionAudit, {
            actor: { id: actor.id } as User,
            targetModule: { id: saved.id } as AccessModule,
            action: dto.isActive ? AUDIT_MODULE_ACTIVATE : AUDIT_MODULE_DEACTIVATE,
            previousPermissions: recorded.previous,
            newPermissions: recorded.next,
            addedPermissions: [],
            removedPermissions: [],
          }),
        )
        return saved
      })
    } catch (error) {
      const recorded = snapshotRef.current
      if (lockout && recorded) {
        await this.audits.save(
          this.audits.create({
            actor: { id: actor.id } as User,
            targetModule: { id: moduleId } as AccessModule,
            action: AUDIT_LOCKOUT_PREVENTED,
            previousPermissions: recorded.previous,
            newPermissions: recorded.next,
            addedPermissions: [],
            removedPermissions: [],
          }),
        )
      }
      throw error
    }

    return this.serializeModule(savedModule)
  }

  private serializeAudit(item: PermissionAudit) {
    return {
      id: item.id,
      action: item.action,
      actor: item.actor
        ? { id: item.actor.id, fullName: item.actor.fullName, email: item.actor.email }
        : null,
      role: item.targetRole
        ? { id: item.targetRole.id, code: item.targetRole.code, name: item.targetRole.name }
        : null,
      module: item.targetModule
        ? { id: item.targetModule.id, code: item.targetModule.code, name: item.targetModule.name }
        : null,
      previousPermissions: item.previousPermissions ?? [],
      newPermissions: item.newPermissions ?? [],
      addedPermissions: item.addedPermissions ?? [],
      removedPermissions: item.removedPermissions ?? [],
      createdAt: item.createdAt.toISOString(),
    }
  }

  private async requireRole(id: string) {
    const role = await this.roles.findOne({ where: { id }, relations: { permissions: true } })
    if (!role) throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE)
    return role
  }

  private serializeModule(module: AccessModule) {
    return {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description ?? '',
      isActive: module.isActive,
      isSystem: module.isSystem,
      sortOrder: module.sortOrder,
    }
  }

  private serializePermission(permission: Permission) {
    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description ?? '',
      action: permission.action,
      module: permission.module
        ? {
            id: permission.module.id,
            code: permission.module.code,
            name: permission.module.name,
            isActive: permission.module.isActive,
            isSystem: permission.module.isSystem,
            sortOrder: permission.module.sortOrder,
          }
        : null,
    }
  }
}
