import { describe, expect, it } from 'vitest'
import { buildOwnProfilePayload, ownProfileNameError } from '@/utils/profile-form'

describe('Actualización del perfil propio', () => {
  it('rechaza un nombre vacío o demasiado corto', () => {
    expect(ownProfileNameError('')).toMatch(/obligatorio/i)
    expect(ownProfileNameError('Al')).toMatch(/al menos 3/i)
  })

  it('arma un payload sin rol ni correo', () => {
    const payload = buildOwnProfilePayload('  Admin Actualizado  ')
    expect(payload).toEqual({ fullName: 'Admin Actualizado' })
    expect(payload).not.toHaveProperty('role')
    expect(payload).not.toHaveProperty('email')
    expect(payload).not.toHaveProperty('status')
  })
})
