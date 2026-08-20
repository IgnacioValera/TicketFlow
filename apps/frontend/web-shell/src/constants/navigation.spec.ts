import { describe, expect, it } from 'vitest'
import { resolveActiveNavPath } from '@/constants/navigation'

const paths = ['/tickets', '/tickets/create', '/crm/clients', '/users', '/ticket-flow']

describe('resolveActiveNavPath', () => {
  it('marca solo Crear ticket en /tickets/create, no el listado', () => {
    expect(resolveActiveNavPath('/tickets/create', paths)).toBe('/tickets/create')
  })

  it('marca Tickets en el listado y en el detalle', () => {
    expect(resolveActiveNavPath('/tickets', paths)).toBe('/tickets')
    expect(resolveActiveNavPath('/tickets/abc-123', paths)).toBe('/tickets')
  })

  it('no confunde Flujo visual con Tickets', () => {
    expect(resolveActiveNavPath('/ticket-flow', paths)).toBe('/ticket-flow')
  })

  it('marca Clientes en el detalle 360', () => {
    expect(resolveActiveNavPath('/crm/clients/c1', paths)).toBe('/crm/clients')
  })
})
