import { RoleCode } from '../database/entities'

export const REQUESTER_CLIENT_REQUIRED = 'Selecciona el cliente al que pertenece el solicitante.'
export const CLIENT_NOT_FOUND = 'El cliente seleccionado no existe.'
export const CLIENT_INACTIVE = 'No puedes vincular un solicitante con un cliente inactivo.'
export const REQUESTER_UNLINKED =
  'Tu usuario no está vinculado con un cliente. Solicita apoyo al administrador.'

export function isPortalManagedRole(role: RoleCode) {
  return role === RoleCode.REQUESTER || role === RoleCode.CLIENT
}

export function isInternalManagedRole(role: RoleCode) {
  return role === RoleCode.ADMIN || role === RoleCode.SUPERVISOR || role === RoleCode.AGENT || role === RoleCode.SALES
}

export function clientIdForRole(role: RoleCode, clientId?: string | null) {
  if (isInternalManagedRole(role)) return null
  return clientId?.trim() || null
}

export function requesterRequiresClient(role: RoleCode, clientId?: string | null) {
  return isPortalManagedRole(role) && !clientId
}
