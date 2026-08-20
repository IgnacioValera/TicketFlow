import type { RolePermissionModule } from '@/types/access.types'

export function assignedPermissionIds(modules: RolePermissionModule[]) {
  return modules.flatMap((module) => module.permissions.filter((item) => item.assigned).map((item) => item.id))
}

export function togglePermission(modules: RolePermissionModule[], permissionId: string): RolePermissionModule[] {
  return modules.map((module) => ({
    ...module,
    permissions: module.permissions.map((permission) =>
      permission.id === permissionId ? { ...permission, assigned: !permission.assigned } : permission,
    ),
  }))
}

export function setModulePermissions(
  modules: RolePermissionModule[],
  moduleId: string,
  assigned: boolean,
): RolePermissionModule[] {
  return modules.map((module) =>
    module.id !== moduleId
      ? module
      : {
          ...module,
          permissions: module.permissions.map((permission) => ({ ...permission, assigned })),
        },
  )
}

export function isModuleFullySelected(module: RolePermissionModule) {
  return module.permissions.length > 0 && module.permissions.every((permission) => permission.assigned)
}

export function hasUnsavedPermissionChanges(savedIds: string[], draftIds: string[]) {
  if (savedIds.length !== draftIds.length) return true
  const saved = new Set(savedIds)
  return draftIds.some((id) => !saved.has(id))
}

export function permissionLabel(code: string) {
  return code.replaceAll('_', ' ').toLowerCase()
}
