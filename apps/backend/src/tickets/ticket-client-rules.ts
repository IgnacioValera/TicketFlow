import { ClientStatus, RoleCode } from '../database/entities'
import { CLIENT_INACTIVE, REQUESTER_UNLINKED } from '../users/user-client-rules'
import { isPortalRole } from '../common/roles'

export const REQUESTER_NOT_FOUND = 'El solicitante seleccionado no existe.'
export const REQUESTER_NOT_PORTAL = 'El usuario seleccionado no es un solicitante.'
export const INCONSISTENT_CLIENT = 'El cliente no coincide con el del solicitante seleccionado.'

export interface TicketPartyError {
  status: 404 | 409 | 422
  message: string
}

export interface TicketParties {
  requesterId: string
  clientId: string | null
  error?: TicketPartyError
}

export function resolveTicketParties(input: {
  actorId: string
  actorRole: RoleCode
  actorClientId?: string | null
  actorClientStatus?: ClientStatus | null
  dtoClientId?: string | null
  dtoRequesterId?: string | null
  selectedRequester?: {
    id: string
    role: RoleCode
    clientId?: string | null
    clientStatus?: ClientStatus | null
  } | null
}): TicketParties {
  if (isPortalRole(input.actorRole)) {
    if (!input.actorClientId) return error(409, REQUESTER_UNLINKED)
    if (input.actorClientStatus !== ClientStatus.ACTIVE) return error(409, CLIENT_INACTIVE)
    return { requesterId: input.actorId, clientId: input.actorClientId }
  }

  if (input.dtoRequesterId) {
    const selected = input.selectedRequester
    if (!selected || selected.id !== input.dtoRequesterId) return error(404, REQUESTER_NOT_FOUND)
    if (!isPortalRole(selected.role)) return error(422, REQUESTER_NOT_PORTAL)
    if (!selected.clientId) return error(409, REQUESTER_UNLINKED)
    if (selected.clientStatus !== ClientStatus.ACTIVE) return error(409, CLIENT_INACTIVE)
    if (input.dtoClientId && input.dtoClientId !== selected.clientId) return error(409, INCONSISTENT_CLIENT)
    return { requesterId: selected.id, clientId: selected.clientId }
  }

  return { requesterId: input.actorId, clientId: null }
}

function error(status: TicketPartyError['status'], message: string): TicketParties {
  return { requesterId: '', clientId: null, error: { status, message } }
}
