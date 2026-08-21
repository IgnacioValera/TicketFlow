export interface AccessRoleSummary {
  id: string
  code: string
  name: string
  description: string
  userCount: number
  permissionCount: number
  permissionsVersion: number
}

export interface AccessModuleSummary {
  id: string
  code: string
  name: string
  description: string
  isActive: boolean
  isSystem: boolean
  sortOrder: number
}

export interface RolePermissionItem {
  id: string
  code: string
  name: string
  description: string
  action: string
  assigned: boolean
}

export interface RolePermissionModule extends AccessModuleSummary {
  permissions: RolePermissionItem[]
}

export interface RolePermissionsPayload {
  role: {
    id: string
    code: string
    name: string
    description?: string
    permissionsVersion: number
  }
  modules: RolePermissionModule[]
}

export interface PermissionAuditItem {
  id: string
  action: string
  actor: { id: string; fullName: string; email: string } | null
  role: { id: string; code: string; name: string } | null
  module: { id: string; code: string; name: string } | null
  previousPermissions: string[]
  newPermissions: string[]
  addedPermissions: string[]
  removedPermissions: string[]
  createdAt: string
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ROLE_PERMISSIONS_UPDATE: 'Actualización de privilegios',
  MODULE_ACTIVATE: 'Activación de módulo',
  MODULE_DEACTIVATE: 'Desactivación de módulo',
  LOCKOUT_PREVENTED: 'Intento bloqueado',
}
