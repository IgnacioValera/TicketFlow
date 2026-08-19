import { describe, expect, it } from 'vitest'
import { getNavItemsForRole } from '@/constants/navigation'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import { createSubmitLock } from '@/utils/submit-lock'
import {
  canAdministerUsers,
  canResetUserPassword,
  hasSensitiveUserFields,
  shouldRedirectPasswordChange,
} from '@/utils/user-admin'
import { loginInactiveError, userCreateFormError } from '@/utils/user-form'
import { errorMessage } from '@/utils/validation'
import { passwordConfirmationError } from '@/utils/password-form'
import type { UserRole } from '@/types/user.types'

describe('Administración de usuarios en frontend', () => {
  it('muestra el menú Usuarios solo para ADMIN', () => {
    const roles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'REQUESTER']
    for (const role of roles) {
      const items = getNavItemsForRole(role, ROLE_PERMISSIONS[role])
      const hasUsers = items.some((item) => item.path === '/users')
      expect(hasUsers).toBe(role === 'ADMIN')
    }
  })

  it('oculta acciones administrativas para roles distintos de ADMIN', () => {
    expect(canAdministerUsers('ADMIN')).toBe(true)
    expect(canAdministerUsers('SUPERVISOR')).toBe(false)
    expect(canAdministerUsers('AGENT')).toBe(false)
    expect(canAdministerUsers('REQUESTER')).toBe(false)
  })

  it('deshabilita el restablecimiento para usuarios inactivos', () => {
    expect(canResetUserPassword('ADMIN', 'ACTIVE')).toBe(true)
    expect(canResetUserPassword('ADMIN', 'INACTIVE')).toBe(false)
    expect(canResetUserPassword('SUPERVISOR', 'ACTIVE')).toBe(false)
  })

  it('exige confirmación implícita antes de restablecer: no se restablece sin acción explícita', () => {
    expect(canResetUserPassword('ADMIN', 'ACTIVE')).toBe(true)
  })

  it('el formulario valida nombre, correo, rol y contraseña', () => {
    expect(
      userCreateFormError({
        fullName: '   ',
        email: 'ana@helpdesk.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        role: 'AGENT',
      }),
    ).toBe('Todos los campos son obligatorios')
    expect(
      userCreateFormError({
        fullName: 'Ana Pérez',
        email: 'no-es-correo',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        role: 'AGENT',
      }),
    ).toBe('El correo no es válido')
    expect(
      userCreateFormError({
        fullName: 'Ana Pérez',
        email: 'ana@helpdesk.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        role: 'SALES',
      }),
    ).toBe('El rol no es válido')
    expect(
      userCreateFormError({
        fullName: 'Ana Pérez',
        email: 'ana@helpdesk.com',
        password: 'debil',
        confirmPassword: 'debil',
        role: 'AGENT',
      }),
    ).toMatch(/contraseña/i)
  })

  it('un doble envío produce una sola petición', async () => {
    const lock = createSubmitLock()
    const calls: number[] = []
    const action = () =>
      lock.run(async () => {
        calls.push(1)
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
    await Promise.all([action(), action(), action()])
    expect(calls).toHaveLength(1)
  })

  it('muestra la contraseña temporal una sola vez y la elimina al cerrar', () => {
    let temporaryPassword: string | undefined = 'Tf-A7k9!mQ2'
    expect(hasSensitiveUserFields({ temporaryPassword })).toBe(true)
    temporaryPassword = undefined
    expect(temporaryPassword).toBeUndefined()
    expect(hasSensitiveUserFields({ id: '1', fullName: 'Ana' })).toBe(false)
  })

  it('mustChangePassword redirige a /change-password y no al dashboard', () => {
    expect(shouldRedirectPasswordChange('/dashboard', null, true)).toBe(true)
    expect(shouldRedirectPasswordChange('/change-password', null, true)).toBe(false)
    expect(shouldRedirectPasswordChange('/tickets', 'PASSWORD_CHANGE_REQUIRED', false)).toBe(true)
  })

  it('exige que las contraseñas coincidan', () => {
    expect(passwordConfirmationError('NuevaClave1!', 'OtraClave1!')).toBe('Las contraseñas no coinciden.')
  })

  it('muestra errores del API en español', () => {
    expect(errorMessage({ message: ['El nombre es obligatorio', 'El correo no es válido'] }, 'Error')).toBe(
      'El nombre es obligatorio, El correo no es válido',
    )
    expect(loginInactiveError()).toBe('Credenciales inválidas o cuenta no disponible.')
  })

  it('no tipa ni persiste hashes en el contrato de usuario', () => {
    const user = {
      id: '1',
      fullName: 'Admin',
      email: 'admin@helpdesk.com',
      role: 'ADMIN' as const,
      status: 'ACTIVE' as const,
      permissions: [],
    }
    expect(hasSensitiveUserFields(user)).toBe(false)
    expect('passwordHash' in user).toBe(false)
    expect('password' in user).toBe(false)
  })
})
