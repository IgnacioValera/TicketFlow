import { RoleCode } from '../database/entities'

export function isPortalRole(code: RoleCode) {
  return code === RoleCode.CLIENT || code === RoleCode.REQUESTER
}

export function isElevatedRole(code: RoleCode) {
  return code === RoleCode.ADMIN || code === RoleCode.SUPERVISOR
}
