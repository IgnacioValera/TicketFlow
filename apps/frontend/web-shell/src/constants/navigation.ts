import { PERMISSIONS } from '@/constants/permissions'
import type { UserRole } from '@/types/user.types'
import type { AppIconName } from '@/components/common/AppIcon'

export interface NavItem {
  label: string
  path: string
  permission?: string
  roles?: UserRole[]
  icon: AppIconName
  group: 'Inicio' | 'CRM' | 'Mesa de ayuda' | 'Administración'
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Panel CRM', path: '/crm/dashboard', permission: PERMISSIONS.CRM_DASHBOARD, icon: 'dashboard', group: 'CRM' },
  { label: 'Clientes', path: '/crm/clients', permission: PERMISSIONS.CRM_CLIENT_VIEW, icon: 'companies', group: 'CRM' },
  { label: 'Contactos', path: '/crm/contacts', permission: PERMISSIONS.CRM_CONTACT_VIEW, icon: 'users', group: 'CRM' },
  { label: 'Oportunidades', path: '/crm/opportunities', permission: PERMISSIONS.CRM_OPPORTUNITY_VIEW, icon: 'flag', group: 'CRM' },
  { label: 'Actividades', path: '/crm/activities', permission: PERMISSIONS.CRM_ACTIVITY_VIEW, icon: 'calendar', group: 'CRM' },
  { label: 'Encuestas', path: '/crm/surveys', permission: PERMISSIONS.CRM_SURVEY_VIEW, icon: 'mail', group: 'CRM' },
  { label: 'Panel', path: '/dashboard', permission: PERMISSIONS.DASHBOARD_VIEW, roles: ['ADMIN', 'SUPERVISOR', 'AGENT'], icon: 'dashboard', group: 'Mesa de ayuda' },
  { label: 'Tickets', path: '/tickets', permission: PERMISSIONS.TICKET_VIEW_OWN, icon: 'tickets', group: 'Mesa de ayuda' },
  { label: 'Flujo visual', path: '/ticket-flow', icon: 'flow', group: 'Mesa de ayuda' },
  { label: 'Crear ticket', path: '/tickets/create', permission: PERMISSIONS.TICKET_CREATE, roles: ['CLIENT', 'REQUESTER', 'AGENT', 'SUPERVISOR', 'ADMIN'], icon: 'plus', group: 'Mesa de ayuda' },
  { label: 'SLA', path: '/catalogs/sla-policies', permission: PERMISSIONS.SLA_MANAGE, roles: ['ADMIN', 'SUPERVISOR'], icon: 'clock', group: 'Mesa de ayuda' },
  { label: 'Categorías', path: '/catalogs/categories', permission: PERMISSIONS.CATEGORY_MANAGE, roles: ['ADMIN'], icon: 'categories', group: 'Mesa de ayuda' },
  { label: 'Prioridades', path: '/catalogs/priorities', permission: PERMISSIONS.PRIORITY_MANAGE, roles: ['ADMIN'], icon: 'priority', group: 'Mesa de ayuda' },
  { label: 'Base de conocimiento', path: '/knowledge', permission: PERMISSIONS.KNOWLEDGE_MANAGE, icon: 'inbox', group: 'Mesa de ayuda' },
  { label: 'Usuarios', path: '/users', permission: PERMISSIONS.USER_MANAGE, roles: ['ADMIN'], icon: 'users', group: 'Administración' },
  { label: 'Reportes', path: '/reports', permission: PERMISSIONS.REPORT_VIEW, roles: ['ADMIN', 'SUPERVISOR'], icon: 'reports', group: 'Administración' },
]

export function getNavItemsForRole(role: UserRole, permissions: string[]): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false
    if (item.permission && !permissions.includes(item.permission)) {
      if (item.path === '/dashboard' && permissions.includes(PERMISSIONS.DASHBOARD_VIEW_LIMITED)) return true
      if (item.path === '/reports' && permissions.includes(PERMISSIONS.REPORT_VIEW_LIMITED)) return true
      if (item.path === '/tickets' && permissions.includes(PERMISSIONS.TICKET_VIEW_ALL)) return true
      if (!item.roles) return false
      return false
    }
    return true
  })
}

export function resolveActiveNavPath(pathname: string, paths: string[]) {
  return [...paths]
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`))
}

