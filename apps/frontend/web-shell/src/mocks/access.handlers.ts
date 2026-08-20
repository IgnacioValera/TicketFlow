import { http, HttpResponse } from 'msw'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import { PERMISSIONS } from '@/types/permission.types'
import type { User } from '@/types/user.types'
import type {
  AccessModuleSummary,
  AccessRoleSummary,
  PermissionAuditItem,
  RolePermissionModule,
} from '@/types/access.types'

const UUID = {
  admin: '11111111-1111-4111-8111-111111111111',
  agent: '22222222-2222-4222-8222-222222222222',
  supervisor: '33333333-3333-4333-8333-333333333333',
  requester: '44444444-4444-4444-8444-444444444444',
  sales: '55555555-5555-4555-8555-555555555555',
  client: '66666666-6666-4666-8666-666666666666',
  tickets: '77777777-7777-4777-8777-777777777777',
  reports: '88888888-8888-4888-8888-888888888888',
  adminModule: '99999999-9999-4999-8999-999999999999',
  crm: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
}

const permissionCatalog: Array<{
  id: string
  code: string
  name: string
  description: string
  action: string
  moduleId: string
}> = [
  { id: 'p-ticket-own', code: PERMISSIONS.TICKET_VIEW_OWN, name: 'Ver tickets asignados', description: 'Consultar tickets propios o asignados.', action: 'VIEW', moduleId: UUID.tickets },
  { id: 'p-ticket-all', code: PERMISSIONS.TICKET_VIEW_ALL, name: 'Ver todos los tickets', description: 'Consultar el inventario completo.', action: 'VIEW', moduleId: UUID.tickets },
  { id: 'p-ticket-create', code: PERMISSIONS.TICKET_CREATE, name: 'Crear tickets', description: 'Registrar un nuevo ticket.', action: 'CREATE', moduleId: UUID.tickets },
  { id: 'p-ticket-status', code: PERMISSIONS.TICKET_STATUS_CHANGE, name: 'Cambiar estado', description: 'Mover un ticket entre estados.', action: 'CHANGE_STATUS', moduleId: UUID.tickets },
  { id: 'p-comment', code: PERMISSIONS.COMMENT_PUBLIC, name: 'Comentar', description: 'Agregar comentarios visibles.', action: 'RESPOND', moduleId: UUID.tickets },
  { id: 'p-report', code: PERMISSIONS.REPORT_VIEW, name: 'Ver reportes', description: 'Consultar reportes operativos.', action: 'VIEW', moduleId: UUID.reports },
  { id: 'p-crm-view', code: PERMISSIONS.CRM_CLIENT_VIEW, name: 'Ver clientes', description: 'Consultar el directorio de clientes.', action: 'VIEW', moduleId: UUID.crm },
  { id: 'p-crm-edit', code: PERMISSIONS.CRM_CLIENT_EDIT, name: 'Editar clientes', description: 'Actualizar un cliente.', action: 'EDIT', moduleId: UUID.crm },
  { id: 'p-role-view', code: PERMISSIONS.ROLE_VIEW, name: 'Ver roles', description: 'Consultar roles.', action: 'VIEW', moduleId: UUID.adminModule },
  { id: 'p-role-manage', code: PERMISSIONS.ROLE_PERMISSION_MANAGE, name: 'Administrar privilegios', description: 'Modificar permisos de un rol.', action: 'MANAGE', moduleId: UUID.adminModule },
  { id: 'p-module-view', code: PERMISSIONS.MODULE_VIEW, name: 'Ver módulos', description: 'Consultar módulos.', action: 'VIEW', moduleId: UUID.adminModule },
  { id: 'p-module-manage', code: PERMISSIONS.MODULE_MANAGE, name: 'Administrar módulos', description: 'Activar o desactivar módulos.', action: 'CONFIGURE', moduleId: UUID.adminModule },
  { id: 'p-audit', code: PERMISSIONS.PERMISSION_AUDIT_VIEW, name: 'Ver historial de privilegios', description: 'Consultar auditoría.', action: 'VIEW', moduleId: UUID.adminModule },
]

const mockModules: AccessModuleSummary[] = [
  { id: UUID.tickets, code: 'TICKETS', name: 'Tickets', description: 'Consulta y seguimiento de tickets.', isActive: true, isSystem: false, sortOrder: 20 },
  { id: UUID.reports, code: 'REPORTS', name: 'Reportes', description: 'Reportes operativos.', isActive: true, isSystem: false, sortOrder: 80 },
  { id: UUID.crm, code: 'CRM_CLIENTS', name: 'Clientes', description: 'Directorio CRM.', isActive: true, isSystem: false, sortOrder: 100 },
  { id: UUID.adminModule, code: 'ADMINISTRATION', name: 'Administración', description: 'Roles y privilegios.', isActive: true, isSystem: true, sortOrder: 200 },
]

const roleMeta: Record<string, { id: string; code: User['role']; name: string; description: string; version: number; permissionIds: string[] }> = {
  ADMIN: {
    id: UUID.admin,
    code: 'ADMIN',
    name: 'Administrador',
    description: 'Acceso completo a la mesa de ayuda, CRM y administración.',
    version: 1,
    permissionIds: permissionCatalog.map((item) => item.id),
  },
  AGENT: {
    id: UUID.agent,
    code: 'AGENT',
    name: 'Agente de soporte',
    description: 'Atención de tickets asignados.',
    version: 1,
    permissionIds: ['p-ticket-own', 'p-ticket-create', 'p-ticket-status', 'p-comment', 'p-crm-view'],
  },
  SUPERVISOR: {
    id: UUID.supervisor,
    code: 'SUPERVISOR',
    name: 'Supervisor',
    description: 'Supervisión de tickets y reportes.',
    version: 1,
    permissionIds: ['p-ticket-own', 'p-ticket-all', 'p-ticket-create', 'p-ticket-status', 'p-comment', 'p-report', 'p-crm-view'],
  },
  REQUESTER: {
    id: UUID.requester,
    code: 'REQUESTER',
    name: 'Solicitante',
    description: 'Portal del solicitante.',
    version: 1,
    permissionIds: ['p-ticket-own', 'p-ticket-create', 'p-comment'],
  },
  SALES: {
    id: UUID.sales,
    code: 'SALES',
    name: 'Ejecutivo comercial',
    description: 'Gestión comercial.',
    version: 1,
    permissionIds: ['p-crm-view', 'p-crm-edit'],
  },
  CLIENT: {
    id: UUID.client,
    code: 'CLIENT',
    name: 'Cliente portal',
    description: 'Portal del cliente.',
    version: 1,
    permissionIds: ['p-ticket-own', 'p-ticket-create', 'p-comment'],
  },
}

const audits: PermissionAuditItem[] = []

function codesFor(role: User['role']) {
  const ids = new Set(roleMeta[role]?.permissionIds ?? [])
  const assignedCatalog = permissionCatalog.filter((item) => ids.has(item.id)).map((item) => item.code)
  const catalogCodes = new Set(permissionCatalog.map((item) => item.code))
  const extras = ROLE_PERMISSIONS[role].filter((code) => !catalogCodes.has(code))
  return [...new Set([...assignedCatalog, ...extras])]
}

function buildModules(roleCode: User['role']): RolePermissionModule[] {
  const assigned = new Set(roleMeta[roleCode]?.permissionIds ?? [])
  return mockModules.map((module) => ({
    ...module,
    permissions: permissionCatalog
      .filter((item) => item.moduleId === module.id)
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        action: item.action,
        assigned: assigned.has(item.id),
      })),
  }))
}

function syncUsers(users: User[]) {
  for (const user of users) {
    const extra = codesFor(user.role)
    const unique = [...new Set(extra)]
    user.permissions = unique
    user.permissionsVersion = roleMeta[user.role]?.version ?? 1
  }
}

function unauthorized() {
  return HttpResponse.json({ success: false, message: 'Token de acceso requerido', data: null, meta: null }, { status: 401 })
}

function forbidden() {
  return HttpResponse.json({ success: false, message: 'No tienes permisos para realizar esta acción', data: null, meta: null }, { status: 403 })
}

export function createAccessHandlers(users: User[], findUser: (header: string | null) => User | undefined) {
  syncUsers(users)

  return [
    http.get('*/roles/:id/permissions/audit', ({ request, params }) => {
      const actor = findUser(request.headers.get('Authorization'))
      if (!actor) return unauthorized()
      if (!actor.permissions.includes(PERMISSIONS.PERMISSION_AUDIT_VIEW) && !actor.permissions.includes(PERMISSIONS.ROLE_PERMISSION_MANAGE)) {
        return forbidden()
      }
      const roleId = String(params.id)
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: audits.filter((item) => item.role?.id === roleId),
        meta: null,
      })
    }),
    http.get('*/roles/:id/permissions', ({ request, params }) => {
      const actor = findUser(request.headers.get('Authorization'))
      if (!actor) return unauthorized()
      if (!actor.permissions.includes(PERMISSIONS.ROLE_VIEW) && !actor.permissions.includes(PERMISSIONS.ROLE_PERMISSION_MANAGE)) {
        return forbidden()
      }
      const role = Object.values(roleMeta).find((item) => item.id === String(params.id))
      if (!role) {
        return HttpResponse.json({ success: false, message: 'El rol no existe.', data: null, meta: null }, { status: 404 })
      }
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: {
          role: { id: role.id, code: role.code, name: role.name, description: role.description, permissionsVersion: role.version },
          modules: buildModules(role.code),
        },
        meta: null,
      })
    }),
    http.put('*/roles/:id/permissions', async ({ request, params }) => {
      const actor = findUser(request.headers.get('Authorization'))
      if (!actor) return unauthorized()
      if (!actor.permissions.includes(PERMISSIONS.ROLE_PERMISSION_MANAGE)) return forbidden()
      const role = Object.values(roleMeta).find((item) => item.id === String(params.id))
      if (!role) {
        return HttpResponse.json({ success: false, message: 'El rol no existe.', data: null, meta: null }, { status: 404 })
      }
      const body = (await request.json()) as { permissionIds?: string[]; expectedVersion?: number }
      if (request.headers.get('X-TicketFlow-Stale-Permissions') === '1' || body.expectedVersion !== role.version) {
        return HttpResponse.json(
          {
            success: false,
            message: 'La configuración de privilegios cambió. Actualiza la página e inténtalo de nuevo.',
            data: null,
            meta: null,
          },
          { status: 409 },
        )
      }
      const previous = [...role.permissionIds]
      role.permissionIds = [...new Set(body.permissionIds ?? [])]
      role.version += 1
      const added = role.permissionIds.filter((id) => !previous.includes(id))
      const removed = previous.filter((id) => !role.permissionIds.includes(id))
      audits.unshift({
        id: `audit-${Date.now()}`,
        action: 'ROLE_PERMISSIONS_UPDATE',
        actor: { id: actor.id, fullName: actor.fullName, email: actor.email },
        role: { id: role.id, code: role.code, name: role.name },
        module: null,
        previousPermissions: previous,
        newPermissions: role.permissionIds,
        addedPermissions: added.map((id) => permissionCatalog.find((item) => item.id === id)?.code ?? id),
        removedPermissions: removed.map((id) => permissionCatalog.find((item) => item.id === id)?.code ?? id),
        createdAt: new Date().toISOString(),
      })
      syncUsers(users)
      return HttpResponse.json({
        success: true,
        message: 'Privilegios actualizados',
        data: {
          role: { id: role.id, code: role.code, name: role.name, description: role.description, permissionsVersion: role.version },
          modules: buildModules(role.code),
        },
        meta: null,
      })
    }),
    http.get('*/roles', ({ request }) => {
      const actor = findUser(request.headers.get('Authorization'))
      if (!actor) return unauthorized()
      if (!actor.permissions.includes(PERMISSIONS.ROLE_VIEW) && !actor.permissions.includes(PERMISSIONS.ROLE_PERMISSION_MANAGE)) {
        return forbidden()
      }
      const data: AccessRoleSummary[] = Object.values(roleMeta).map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        userCount: users.filter((user) => user.role === role.code).length,
        permissionCount: role.permissionIds.length,
        permissionsVersion: role.version,
      }))
      return HttpResponse.json({ success: true, message: 'OK', data, meta: null })
    }),
    http.get('*/modules/audit', ({ request }) => {
      const actor = findUser(request.headers.get('Authorization'))
      if (!actor) return unauthorized()
      if (
        !actor.permissions.includes(PERMISSIONS.PERMISSION_AUDIT_VIEW) &&
        !actor.permissions.includes(PERMISSIONS.ROLE_PERMISSION_MANAGE)
      ) {
        return forbidden()
      }
      return HttpResponse.json({ success: true, message: 'OK', data: audits.filter((item) => item.module), meta: null })
    }),
    http.get('*/modules', ({ request }) => {
      const actor = findUser(request.headers.get('Authorization'))
      if (!actor) return unauthorized()
      if (
        !actor.permissions.includes(PERMISSIONS.MODULE_VIEW) &&
        !actor.permissions.includes(PERMISSIONS.ROLE_PERMISSION_MANAGE) &&
        !actor.permissions.includes(PERMISSIONS.MODULE_MANAGE)
      ) {
        return forbidden()
      }
      return HttpResponse.json({ success: true, message: 'OK', data: mockModules, meta: null })
    }),
    http.patch('*/modules/:id/status', async ({ request, params }) => {
      const actor = findUser(request.headers.get('Authorization'))
      if (!actor) return unauthorized()
      if (!actor.permissions.includes(PERMISSIONS.MODULE_MANAGE)) return forbidden()
      const module = mockModules.find((item) => item.id === String(params.id))
      if (!module) {
        return HttpResponse.json({ success: false, message: 'El módulo no existe.', data: null, meta: null }, { status: 404 })
      }
      const body = (await request.json()) as { isActive?: boolean }
      if (module.isSystem && body.isActive === false) {
        return HttpResponse.json(
          {
            success: false,
            message: 'No se puede desactivar el módulo de Administración porque dejaría al sistema sin forma de volver a habilitarlo.',
            data: null,
            meta: null,
          },
          { status: 409 },
        )
      }
      module.isActive = Boolean(body.isActive)
      audits.unshift({
        id: `audit-mod-${Date.now()}`,
        action: module.isActive ? 'MODULE_ACTIVATE' : 'MODULE_DEACTIVATE',
        actor: { id: actor.id, fullName: actor.fullName, email: actor.email },
        role: null,
        module: { id: module.id, code: module.code, name: module.name },
        previousPermissions: [module.isActive ? 'INACTIVE' : 'ACTIVE'],
        newPermissions: [module.isActive ? 'ACTIVE' : 'INACTIVE'],
        addedPermissions: [],
        removedPermissions: [],
        createdAt: new Date().toISOString(),
      })
      return HttpResponse.json({ success: true, message: 'Estado del módulo actualizado', data: module, meta: null })
    }),
    http.get('*/permissions', ({ request }) => {
      const actor = findUser(request.headers.get('Authorization'))
      if (!actor) return unauthorized()
      if (!actor.permissions.includes(PERMISSIONS.ROLE_VIEW) && !actor.permissions.includes(PERMISSIONS.ROLE_PERMISSION_MANAGE)) {
        return forbidden()
      }
      const url = new URL(request.url)
      const moduleId = url.searchParams.get('moduleId')
      const moduleCode = url.searchParams.get('moduleCode')
      const action = url.searchParams.get('action')
      let items = permissionCatalog.map((item) => ({
        ...item,
        module: mockModules.find((module) => module.id === item.moduleId) ?? null,
      }))
      if (moduleId) items = items.filter((item) => item.moduleId === moduleId)
      if (moduleCode) items = items.filter((item) => item.module?.code === moduleCode)
      if (action) items = items.filter((item) => item.action === action)
      return HttpResponse.json({ success: true, message: 'OK', data: items, meta: null })
    }),
  ]
}
