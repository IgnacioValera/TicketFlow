import { validatePasswordPolicy } from './validation'
import { generateTemporaryPassword } from './password'

describe('Contraseña temporal', () => {
  it('cumple la política de contraseñas', () => {
    for (let i = 0; i < 10; i += 1) {
      const password = generateTemporaryPassword()
      expect(validatePasswordPolicy(password).ok).toBe(true)
      expect(password.startsWith('Tf-')).toBe(true)
    }
  })
})
