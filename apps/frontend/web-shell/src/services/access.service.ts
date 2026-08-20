import { apiGet, apiPatch, apiPut } from '@/services/apiClient'
import type {
  AccessModuleSummary,
  AccessRoleSummary,
  PermissionAuditItem,
  RolePermissionsPayload,
} from '@/types/access.types'

export async function listRoles() {
  const response = await apiGet<AccessRoleSummary[]>('/roles')
  return response.data
}

export async function listModules() {
  const response = await apiGet<AccessModuleSummary[]>('/modules')
  return response.data
}

export async function getRolePermissions(roleId: string) {
  const response = await apiGet<RolePermissionsPayload>(`/roles/${roleId}/permissions`)
  return response.data
}

export async function updateRolePermissions(
  roleId: string,
  payload: { permissionIds: string[]; expectedVersion: number },
) {
  const response = await apiPut<RolePermissionsPayload>(`/roles/${roleId}/permissions`, payload)
  return response.data
}

export async function getRoleAudit(roleId: string) {
  const response = await apiGet<PermissionAuditItem[]>(`/roles/${roleId}/permissions/audit`)
  return response.data
}

export async function getModuleAudit() {
  const response = await apiGet<PermissionAuditItem[]>('/modules/audit')
  return response.data
}

export async function updateModuleStatus(moduleId: string, isActive: boolean) {
  const response = await apiPatch<AccessModuleSummary>(`/modules/${moduleId}/status`, { isActive })
  return response.data
}
