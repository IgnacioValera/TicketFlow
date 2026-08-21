import { describe, expect, it } from 'vitest'
import {
  buildClientPayload,
  mapClientApiError,
  validateClientForm,
} from '@/utils/client-form'
import type { ClientFormValues } from '@/utils/client-form'

const valid: ClientFormValues = {
  name: 'Acme Corp',
  industry: 'Tecnología',
  region: 'Centro',
  tier: 'GOLD',
  segment: 'SMB',
  email: 'contacto@acme.test',
  phone: '777 111 2233',
  status: 'PROSPECT',
}

describe('Formulario de clientes', () => {
  it('rechaza campos vacíos o solo espacios', () => {
    const errors = validateClientForm({ ...valid, name: '   ', industry: '', email: '  ' })
    expect(errors.name).toMatch(/obligatorio/i)
    expect(errors.industry).toMatch(/obligatorio/i)
    expect(errors.email).toMatch(/obligatorio/i)
  })

  it('rechaza correo y teléfono inválidos', () => {
    const errors = validateClientForm({ ...valid, email: 'no-es-correo', phone: 'abc' })
    expect(errors.email).toMatch(/correo no es válido/i)
    expect(errors.phone).toMatch(/8 y 10 dígitos/i)
  })

  it('acepta un cliente válido y normaliza el payload', () => {
    expect(validateClientForm(valid)).toEqual({})
    expect(buildClientPayload(valid)).toMatchObject({
      name: 'Acme Corp',
      email: 'contacto@acme.test',
      phone: '7771112233',
    })
  })

  it('asocia el mensaje del API al campo correspondiente', () => {
    expect(mapClientApiError('Ya existe un cliente con ese nombre').name).toMatch(/nombre/i)
    expect(mapClientApiError('Ya existe un cliente con ese correo').email).toMatch(/correo/i)
  })
})
