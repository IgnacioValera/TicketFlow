import { ClientStatus, RoleCode } from '../database/entities'
import { REQUESTER_UNLINKED } from '../users/user-client-rules'
import { INCONSISTENT_CLIENT, resolveTicketParties } from './ticket-client-rules'

describe('Resolución de cliente al crear tickets', () => {
  it('usa el cliente de sesión del solicitante e ignora otro clientId', () => {
    const result = resolveTicketParties({
      actorId: 'req',
      actorRole: RoleCode.REQUESTER,
      actorClientId: 'client-a',
      actorClientStatus: ClientStatus.ACTIVE,
      dtoClientId: 'client-b',
    })
    expect(result).toEqual({ requesterId: 'req', clientId: 'client-a' })
  })

  it('impide crear ticket si el solicitante no tiene cliente', () => {
    const result = resolveTicketParties({
      actorId: 'req',
      actorRole: RoleCode.REQUESTER,
      actorClientId: null,
    })
    expect(result.error?.status).toBe(409)
    expect(result.error?.message).toBe(REQUESTER_UNLINKED)
  })

  it('deriva el cliente del solicitante elegido por un administrador', () => {
    const result = resolveTicketParties({
      actorId: 'admin',
      actorRole: RoleCode.ADMIN,
      dtoRequesterId: 'req',
      dtoClientId: 'client-a',
      selectedRequester: {
        id: 'req',
        role: RoleCode.REQUESTER,
        clientId: 'client-a',
        clientStatus: ClientStatus.ACTIVE,
      },
    })
    expect(result).toEqual({ requesterId: 'req', clientId: 'client-a' })
  })

  it('rechaza combinaciones inconsistentes de solicitante y cliente', () => {
    const result = resolveTicketParties({
      actorId: 'admin',
      actorRole: RoleCode.ADMIN,
      dtoRequesterId: 'req',
      dtoClientId: 'otro',
      selectedRequester: {
        id: 'req',
        role: RoleCode.REQUESTER,
        clientId: 'client-a',
        clientStatus: ClientStatus.ACTIVE,
      },
    })
    expect(result.error?.status).toBe(409)
    expect(result.error?.message).toBe(INCONSISTENT_CLIENT)
  })

  it('no asigna cliente cuando un interno crea el ticket a su nombre', () => {
    const result = resolveTicketParties({
      actorId: 'admin',
      actorRole: RoleCode.ADMIN,
      dtoClientId: 'client-a',
    })
    expect(result).toEqual({ requesterId: 'admin', clientId: null })
  })
})
