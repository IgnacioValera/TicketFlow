import { PERMISSIONS } from '@/constants/permissions'
import type { UserRole } from '@/types/user.types'

export interface NavItem {
  label: string
  path: string
  permission?: string
  roles?: UserRole[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    permission: PERMISSIONS.DASHBOARD_VIEW,
    roles: ['ADMIN', 'SUPERVISOR', 'AGENT'],
  },
  {
    label: 'Tickets',
    path: '/tickets',
    permission: PERMISSIONS.TICKET_VIEW_OWN,
  },
  {
    label: 'Crear ticket',
    path: '/tickets/create',
    permission: PERMISSIONS.TICKET_CREATE,
    roles: ['REQUESTER', 'AGENT', 'SUPERVISOR', 'ADMIN'],
  },
  {
    label: 'Usuarios',
    path: '/users',
    permission: PERMISSIONS.USER_MANAGE,
    roles: ['ADMIN'],
  },
  {
    label: 'Reportes',
    path: '/reports',
    permission: PERMISSIONS.REPORT_VIEW,
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    label: 'Mi perfil',
    path: '/profile',
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
