import { PERMISSIONS } from '@/constants/permissions'
import type { UserRole } from '@/types/user.types'
import type { AppIconName } from '@/components/common/AppIcon'

export interface NavItem {
  label: string
  path: string
  permission?: string
  roles?: UserRole[]
  icon: AppIconName
  group: 'Operación' | 'Administración' | 'Analítica' | 'Cuenta'
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    permission: PERMISSIONS.DASHBOARD_VIEW,
    roles: ['ADMIN', 'SUPERVISOR', 'AGENT'],
    icon: 'dashboard',
    group: 'Operación',
  },
  {
    label: 'Tickets',
    path: '/tickets',
    permission: PERMISSIONS.TICKET_VIEW_OWN,
    icon: 'tickets',
    group: 'Operación',
  },
  {
    label: 'Flujo visual',
    path: '/ticket-flow',
    icon: 'flow',
    group: 'Operación',
  },
  {
    label: 'Crear ticket',
    path: '/tickets/create',
    permission: PERMISSIONS.TICKET_CREATE,
    roles: ['REQUESTER', 'AGENT', 'SUPERVISOR', 'ADMIN'],
    icon: 'plus',
    group: 'Operación',
  },
  {
    label: 'Usuarios',
    path: '/users',
    permission: PERMISSIONS.USER_MANAGE,
    roles: ['ADMIN'],
    icon: 'users',
    group: 'Administración',
  },
  {
    label: 'Categorías',
    path: '/catalogs/categories',
    permission: PERMISSIONS.CATEGORY_MANAGE,
    roles: ['ADMIN'],
    icon: 'categories',
    group: 'Administración',
  },
  {
    label: 'Prioridades',
    path: '/catalogs/priorities',
    permission: PERMISSIONS.PRIORITY_MANAGE,
    roles: ['ADMIN'],
    icon: 'priority',
    group: 'Administración',
  },
  {
    label: 'SLA',
    path: '/catalogs/sla-policies',
    permission: PERMISSIONS.SLA_MANAGE,
    roles: ['ADMIN', 'SUPERVISOR'],
    icon: 'clock',
    group: 'Administración',
  },
  {
    label: 'Empresas',
    path: '/catalogs/companies',
    permission: PERMISSIONS.CATEGORY_MANAGE,
    roles: ['ADMIN'],
    icon: 'companies',
    group: 'Administración',
  },
  {
    label: 'Reportes',
    path: '/reports',
    permission: PERMISSIONS.REPORT_VIEW,
    roles: ['ADMIN', 'SUPERVISOR'],
    icon: 'reports',
    group: 'Analítica',
  },
  {
    label: 'Mi perfil',
    path: '/profile',
    icon: 'profile',
    group: 'Cuenta',
  },
]

export function getNavItemsForRole(role: UserRole, permissions: string[]): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false
    if (item.permission && !permissions.includes(item.permission)) {
      if (item.path === '/dashboard' && permissions.includes(PERMISSIONS.DASHBOARD_VIEW_LIMITED)) {
        return true
      }
      if (item.path === '/reports' && permissions.includes(PERMISSIONS.REPORT_VIEW_LIMITED)) {
        return true
      }
      if (item.path === '/tickets' && permissions.includes(PERMISSIONS.TICKET_VIEW_ALL)) {
        return true
      }
      if (!item.roles) return false
      return false
    }
    return true
  })
}
