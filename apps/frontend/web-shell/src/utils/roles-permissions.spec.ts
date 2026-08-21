import { describe, expect, it } from 'vitest'
import { getNavItemsForRole } from '@/constants/navigation'
import { PERMISSIONS } from '@/constants/permissions'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import type { RolePermissionModule } from '@/types/access.types'
import {
  assignedPermissionIds,
  hasUnsavedPermissionChanges,
  isModuleFullySelected,
  setModulePermissions,
  togglePermission,
} from '@/utils/roles-permissions'

const tickets: RolePermissionModule = {
  id: 'm1',
  code: 'TICKETS',
  name: 'Tickets',
  description: '',
  isActive: true,
  isSystem: false,
  sortOrder: 1,
  permissions: [
    { id: 'p1', code: 'TICKET_VIEW_OWN', name: 'Ver tickets asignados', description: '', action: 'VIEW', assigned: true },
    { id: 'p2', code: 'TICKET_CREATE', name: 'Crear tickets', description: '', action: 'CREATE', assigned: false },
  ],
}

describe('Roles y privilegios en frontend', () => {
  it('muestra el menú solo con ROLE_PERMISSION_MANAGE y no por el nombre del rol', () => {
    expect(getNavItemsForRole('ADMIN', []).some((item) => item.path === '/administration/roles-permissions')).toBe(false)
    expect(
      getNavItemsForRole('AGENT', [PERMISSIONS.ROLE_PERMISSION_MANAGE]).some(
        (item) => item.path === '/administration/roles-permissions',
      ),
    ).toBe(true)
    expect(
      getNavItemsForRole('ADMIN', ROLE_PERMISSIONS.ADMIN).some((item) => item.path === '/administration/roles-permissions'),
    ).toBe(true)
  })

  it('un arreglo vacío de permisos no se reconstruye por rol', () => {
    const emptyAdmin = getNavItemsForRole('ADMIN', [])
    expect(emptyAdmin.some((item) => item.path === '/users')).toBe(false)
    expect(emptyAdmin.some((item) => item.path === '/administration/roles-permissions')).toBe(false)
  })

  it('marca, desmarca y selecciona todos los permisos de un módulo', () => {
    const toggled = togglePermission([tickets], 'p2')
    expect(assignedPermissionIds(toggled)).toEqual(['p1', 'p2'])
    const all = setModulePermissions(toggled, 'm1', true)
    expect(isModuleFullySelected(all[0])).toBe(true)
    const none = setModulePermissions(all, 'm1', false)
    expect(assignedPermissionIds(none)).toEqual([])
  })

  it('detecta cambios sin guardar', () => {
    expect(hasUnsavedPermissionChanges(['p1'], ['p1', 'p2'])).toBe(true)
    expect(hasUnsavedPermissionChanges(['p1', 'p2'], ['p2', 'p1'])).toBe(false)
  })

  it('muestra cada módulo por su permiso, no por el nombre del rol', () => {
    const agentWithCatalogs = getNavItemsForRole('AGENT', [
      PERMISSIONS.SLA_MANAGE,
      PERMISSIONS.CATEGORY_MANAGE,
      PERMISSIONS.PRIORITY_MANAGE,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.DASHBOARD_VIEW_LIMITED,
      PERMISSIONS.TICKET_VIEW_ALL,
      PERMISSIONS.TICKET_CREATE,
    ])
    expect(agentWithCatalogs.map((item) => item.path).sort()).toEqual(
      [
        '/catalogs/categories',
        '/catalogs/priorities',
        '/catalogs/sla-policies',
        '/dashboard',
        '/ticket-flow',
        '/tickets',
        '/tickets/create',
        '/users',
      ].sort(),
    )
    expect(getNavItemsForRole('ADMIN', [PERMISSIONS.CRM_CLIENT_VIEW]).some((item) => item.path === '/crm/clients')).toBe(true)
    expect(getNavItemsForRole('ADMIN', [PERMISSIONS.CRM_CLIENT_VIEW]).some((item) => item.path === '/users')).toBe(false)
    expect(getNavItemsForRole('SALES', [PERMISSIONS.TICKET_VIEW_OWN]).some((item) => item.path === '/ticket-flow')).toBe(true)
    expect(getNavItemsForRole('SALES', [PERMISSIONS.CRM_DASHBOARD]).some((item) => item.path === '/ticket-flow')).toBe(false)
  })

  it('muestra Reportes al agente con ver reportes limitados, no por el nombre del rol', () => {
    expect(getNavItemsForRole('AGENT', [PERMISSIONS.REPORT_VIEW_LIMITED]).some((item) => item.path === '/reports')).toBe(true)
    expect(getNavItemsForRole('AGENT', [PERMISSIONS.TICKET_VIEW_OWN]).some((item) => item.path === '/reports')).toBe(false)
  })

  it('oculta de inmediato un menú cuyo permiso fue retirado', () => {
    const before = getNavItemsForRole('ADMIN', [PERMISSIONS.REPORT_VIEW, PERMISSIONS.USER_MANAGE, PERMISSIONS.ROLE_PERMISSION_MANAGE])
    expect(before.some((item) => item.path === '/reports')).toBe(true)
    const after = getNavItemsForRole('ADMIN', [PERMISSIONS.USER_MANAGE, PERMISSIONS.ROLE_PERMISSION_MANAGE])
    expect(after.some((item) => item.path === '/reports')).toBe(false)
  })
})
