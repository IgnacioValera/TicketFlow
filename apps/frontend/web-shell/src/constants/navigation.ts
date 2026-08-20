import { PERMISSIONS } from '@/constants/permissions'
import type { UserRole } from '@/types/user.types'
import type { AppIconName } from '@/components/common/AppIcon'

export interface NavItem {
  label: string
  path: string
  permission: string
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
  { label: 'Panel', path: '/dashboard', permission: PERMISSIONS.DASHBOARD_VIEW, icon: 'dashboard', group: 'Mesa de ayuda' },
  { label: 'Tickets', path: '/tickets', permission: PERMISSIONS.TICKET_VIEW_OWN, icon: 'tickets', group: 'Mesa de ayuda' },
  { label: 'Flujo visual', path: '/ticket-flow', permission: PERMISSIONS.TICKET_VIEW_OWN, icon: 'flow', group: 'Mesa de ayuda' },
  { label: 'Crear ticket', path: '/tickets/create', permission: PERMISSIONS.TICKET_CREATE, icon: 'plus', group: 'Mesa de ayuda' },
  { label: 'SLA', path: '/catalogs/sla-policies', permission: PERMISSIONS.SLA_MANAGE, icon: 'clock', group: 'Mesa de ayuda' },
  { label: 'Categorías', path: '/catalogs/categories', permission: PERMISSIONS.CATEGORY_MANAGE, icon: 'categories', group: 'Mesa de ayuda' },
  { label: 'Prioridades', path: '/catalogs/priorities', permission: PERMISSIONS.PRIORITY_MANAGE, icon: 'priority', group: 'Mesa de ayuda' },
  { label: 'Base de conocimiento', path: '/knowledge', permission: PERMISSIONS.KNOWLEDGE_MANAGE, icon: 'inbox', group: 'Mesa de ayuda' },
  { label: 'Usuarios', path: '/users', permission: PERMISSIONS.USER_MANAGE, icon: 'users', group: 'Administración' },
  { label: 'Roles y privilegios', path: '/administration/roles-permissions', permission: PERMISSIONS.ROLE_PERMISSION_MANAGE, icon: 'shield', group: 'Administración' },
  { label: 'Reportes', path: '/reports', permission: PERMISSIONS.REPORT_VIEW, icon: 'reports', group: 'Administración' },
]

/** Permisos que también abren el mismo ítem de menú. */
export const NAV_PERMISSION_ALIASES: Record<string, string[]> = {
  [PERMISSIONS.DASHBOARD_VIEW]: [PERMISSIONS.DASHBOARD_VIEW_LIMITED],
  [PERMISSIONS.REPORT_VIEW]: [PERMISSIONS.REPORT_VIEW_LIMITED],
  [PERMISSIONS.TICKET_VIEW_OWN]: [PERMISSIONS.TICKET_VIEW_ALL],
}

export function permissionsGrantAccess(owned: string[], required: string) {
  if (owned.includes(required)) return true
  return (NAV_PERMISSION_ALIASES[required] ?? []).some((code) => owned.includes(code))
}

export function getNavItemsForRole(_role: UserRole, permissions: string[]): NavItem[] {
  return NAV_ITEMS.filter((item) => permissionsGrantAccess(permissions, item.permission))
}

export function resolveActiveNavPath(pathname: string, paths: string[]) {
  return [...paths]
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`))
}
