import { RoleCode } from '../database/entities'
import {
  clientIdForRole,
  isInternalManagedRole,
  isPortalManagedRole,
  requesterRequiresClient,
  REQUESTER_CLIENT_REQUIRED,
} from './user-client-rules'

describe('Reglas de cliente para usuarios', () => {
  it('exige cliente solo a solicitantes', () => {
    expect(isPortalManagedRole(RoleCode.REQUESTER)).toBe(true)
    expect(isInternalManagedRole(RoleCode.AGENT)).toBe(true)
    expect(requesterRequiresClient(RoleCode.REQUESTER, null)).toBe(true)
    expect(requesterRequiresClient(RoleCode.REQUESTER, 'client-1')).toBe(false)
    expect(requesterRequiresClient(RoleCode.AGENT, null)).toBe(false)
    expect(REQUESTER_CLIENT_REQUIRED).toContain('cliente')
  })

  it('normaliza el cliente de usuarios internos a nulo', () => {
    expect(clientIdForRole(RoleCode.ADMIN, 'client-1')).toBeNull()
    expect(clientIdForRole(RoleCode.REQUESTER, 'client-1')).toBe('client-1')
  })
})
