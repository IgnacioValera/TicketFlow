import { describe, expect, it } from 'vitest'
import { createSubmitLock } from '@/utils/submit-lock'
import {
  canUseHistoryBack,
  getHomePath,
  LOADER_STATUS_PROPS,
  READABLE_ROLES,
  resolveContentStatus,
  resolveSessionGate,
} from '@/utils/session-gate'

describe('Puerta de sesión y destinos de error', () => {
  it('prioriza el loader mientras valida la sesión y no el panel', () => {
    expect(
      resolveSessionGate({
        isLoading: true,
        isAuthenticated: true,
        pathname: '/dashboard',
      }),
    ).toBe('loader')
  })

  it('envía a login si no hay sesión', () => {
    expect(
      resolveSessionGate({
        isLoading: false,
        isAuthenticated: false,
        pathname: '/tickets',
      }),
    ).toBe('login')
    expect(getHomePath(null)).toBe('/login')
  })

  it('exige /change-password antes que cualquier otra ruta', () => {
    expect(
      resolveSessionGate({
        isLoading: false,
        isAuthenticated: true,
        mustChangePassword: true,
        pathname: '/tickets',
      }),
    ).toBe('change-password')
    expect(getHomePath({ role: 'ADMIN', mustChangePassword: true })).toBe('/change-password')
  })

  it('Ir al inicio usa el panel del rol sin códigos internos', () => {
    expect(getHomePath({ role: 'ADMIN' })).toBe('/dashboard')
    expect(getHomePath({ role: 'SUPERVISOR' })).toBe('/dashboard')
    expect(getHomePath({ role: 'AGENT' })).toBe('/dashboard')
    expect(getHomePath({ role: 'REQUESTER' })).toBe('/tickets')
    expect(READABLE_ROLES.ADMIN).toBe('Administrador')
    expect(READABLE_ROLES.SUPERVISOR).toBe('Supervisor')
    expect(READABLE_ROLES.AGENT).toBe('Agente')
    expect(READABLE_ROLES.REQUESTER).toBe('Solicitante')
  })

  it('no muestra skeleton cuando la consulta terminó vacía', () => {
    expect(resolveContentStatus({ loading: false, error: null, itemCount: 0 })).toBe('empty')
    expect(resolveContentStatus({ loading: true, itemCount: 0 })).toBe('loading')
    expect(resolveContentStatus({ loading: false, error: 'falló', itemCount: 0 })).toBe('error')
    expect(resolveContentStatus({ loading: true, itemCount: 3 })).toBe('ready')
  })

  it('reemplaza el loader por error y no lo deja infinito', () => {
    const status = resolveContentStatus({ loading: false, error: 'No se pudieron cargar los usuarios.', itemCount: 0 })
    expect(status).toBe('error')
    expect(status).not.toBe('loading')
  })

  it('Volver usa historial solo cuando existe una entrada útil', () => {
    expect(canUseHistoryBack('default')).toBe(false)
    expect(canUseHistoryBack('abc123')).toBe(true)
  })

  it('los loaders exponen atributos de accesibilidad', () => {
    expect(LOADER_STATUS_PROPS.role).toBe('status')
    expect(LOADER_STATUS_PROPS['aria-live']).toBe('polite')
  })

  it('un doble envío produce una sola petición', async () => {
    const lock = createSubmitLock()
    let calls = 0
    const action = async () => {
      calls += 1
    }
    await Promise.all([lock.run(action), lock.run(action)])
    expect(calls).toBe(1)
  })
})
