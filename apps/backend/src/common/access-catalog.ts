import { PERMISSIONS } from './permissions'

export const ACCESS_MODULE_CODES = {
  DASHBOARD: 'DASHBOARD',
  TICKETS: 'TICKETS',
  CATEGORIES: 'CATEGORIES',
  PRIORITIES: 'PRIORITIES',
  ASSIGNMENT: 'ASSIGNMENT',
  COMMENTS: 'COMMENTS',
  SLA: 'SLA',
  REPORTS: 'REPORTS',
  USERS: 'USERS',
  CRM_CLIENTS: 'CRM_CLIENTS',
  CRM_CONTACTS: 'CRM_CONTACTS',
  CRM_OPPORTUNITIES: 'CRM_OPPORTUNITIES',
  CRM_ACTIVITIES: 'CRM_ACTIVITIES',
  CRM_SURVEYS: 'CRM_SURVEYS',
  CRM_RESULTS: 'CRM_RESULTS',
  KNOWLEDGE: 'KNOWLEDGE',
  NOTIFICATIONS: 'NOTIFICATIONS',
  ADMINISTRATION: 'ADMINISTRATION',
} as const

export const ADMINISTRATION_MODULE_CODE = ACCESS_MODULE_CODES.ADMINISTRATION
export const ROLE_PERMISSION_MANAGE = PERMISSIONS.ROLE_PERMISSION_MANAGE
export const MODULE_MANAGE = PERMISSIONS.MODULE_MANAGE

export const ACCESS_MODULES = [
  { code: ACCESS_MODULE_CODES.DASHBOARD, name: 'Panel', description: 'Paneles de mesa de ayuda y CRM.', isSystem: false, sortOrder: 10 },
  { code: ACCESS_MODULE_CODES.TICKETS, name: 'Tickets', description: 'Consulta, creación y seguimiento de tickets.', isSystem: false, sortOrder: 20 },
  { code: ACCESS_MODULE_CODES.ASSIGNMENT, name: 'Asignación', description: 'Asignar y reasignar tickets a agentes.', isSystem: false, sortOrder: 30 },
  { code: ACCESS_MODULE_CODES.COMMENTS, name: 'Comentarios', description: 'Comentarios públicos, internos y adjuntos.', isSystem: false, sortOrder: 40 },
  { code: ACCESS_MODULE_CODES.CATEGORIES, name: 'Categorías', description: 'Catálogo de categorías de tickets.', isSystem: false, sortOrder: 50 },
  { code: ACCESS_MODULE_CODES.PRIORITIES, name: 'Prioridades', description: 'Catálogo de prioridades de tickets.', isSystem: false, sortOrder: 60 },
  { code: ACCESS_MODULE_CODES.SLA, name: 'SLA', description: 'Políticas de tiempo de respuesta y resolución.', isSystem: false, sortOrder: 70 },
  { code: ACCESS_MODULE_CODES.REPORTS, name: 'Reportes', description: 'Reportes operativos y exportación de CRM.', isSystem: false, sortOrder: 80 },
  { code: ACCESS_MODULE_CODES.USERS, name: 'Usuarios', description: 'Administración de cuentas internas y solicitantes.', isSystem: false, sortOrder: 90 },
  { code: ACCESS_MODULE_CODES.CRM_CLIENTS, name: 'Clientes', description: 'Directorio y ficha de clientes CRM.', isSystem: false, sortOrder: 100 },
  { code: ACCESS_MODULE_CODES.CRM_CONTACTS, name: 'Contactos', description: 'Contactos asociados a clientes.', isSystem: false, sortOrder: 110 },
  { code: ACCESS_MODULE_CODES.CRM_OPPORTUNITIES, name: 'Oportunidades', description: 'Pipeline comercial y etapas.', isSystem: false, sortOrder: 120 },
  { code: ACCESS_MODULE_CODES.CRM_ACTIVITIES, name: 'Actividades', description: 'Llamadas, reuniones y tareas CRM.', isSystem: false, sortOrder: 130 },
  { code: ACCESS_MODULE_CODES.CRM_SURVEYS, name: 'Encuestas', description: 'Diseño y publicación de encuestas CRM.', isSystem: false, sortOrder: 140 },
  { code: ACCESS_MODULE_CODES.CRM_RESULTS, name: 'Resultados', description: 'Resultados y respuestas de encuestas.', isSystem: false, sortOrder: 150 },
  { code: ACCESS_MODULE_CODES.KNOWLEDGE, name: 'Base de conocimiento', description: 'Artículos de ayuda para la mesa.', isSystem: false, sortOrder: 160 },
  { code: ACCESS_MODULE_CODES.NOTIFICATIONS, name: 'Notificaciones', description: 'Alertas internas de la plataforma.', isSystem: false, sortOrder: 170 },
  { code: ACCESS_MODULE_CODES.ADMINISTRATION, name: 'Administración', description: 'Roles, privilegios y módulos del sistema.', isSystem: true, sortOrder: 200 },
] as const

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: 'Acceso completo a la mesa de ayuda, CRM y administración del sistema.',
  SALES: 'Gestión comercial de clientes, oportunidades, actividades y encuestas.',
  SUPERVISOR: 'Supervisión de tickets, reportes, conocimiento y consulta de CRM.',
  AGENT: 'Atención de tickets asignados y consulta limitada de clientes.',
  CLIENT: 'Portal del cliente para crear y dar seguimiento a sus tickets.',
  REQUESTER: 'Portal del solicitante para crear y dar seguimiento a sus tickets.',
}

export const PERMISSION_DEFINITIONS = [
  { code: PERMISSIONS.LOGIN, name: 'Iniciar sesión', description: 'Acceder a la plataforma con una cuenta activa.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.ADMINISTRATION },
  { code: PERMISSIONS.TICKET_CREATE, name: 'Crear tickets', description: 'Registrar un nuevo ticket.', action: 'CREATE', moduleCode: ACCESS_MODULE_CODES.TICKETS },
  { code: PERMISSIONS.TICKET_VIEW_OWN, name: 'Ver tickets asignados', description: 'Consultar los tickets propios o asignados.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.TICKETS },
  { code: PERMISSIONS.TICKET_VIEW_ALL, name: 'Ver todos los tickets', description: 'Consultar el inventario completo de tickets.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.TICKETS },
  { code: PERMISSIONS.TICKET_EDIT_OWN, name: 'Editar tickets propios', description: 'Actualizar la información de tickets propios.', action: 'EDIT', moduleCode: ACCESS_MODULE_CODES.TICKETS },
  { code: PERMISSIONS.TICKET_STATUS_CHANGE, name: 'Cambiar estado', description: 'Mover un ticket entre estados permitidos.', action: 'CHANGE_STATUS', moduleCode: ACCESS_MODULE_CODES.TICKETS },
  { code: PERMISSIONS.TICKET_ESCALATE, name: 'Escalar tickets', description: 'Escalar un ticket al equipo de supervisión.', action: 'MANAGE', moduleCode: ACCESS_MODULE_CODES.TICKETS },
  { code: PERMISSIONS.SURVEY_RESPOND, name: 'Responder encuesta', description: 'Responder la encuesta de satisfacción de un ticket cerrado.', action: 'RESPOND', moduleCode: ACCESS_MODULE_CODES.TICKETS },
  { code: PERMISSIONS.TICKET_ASSIGN, name: 'Asignar tickets', description: 'Asignar un ticket a un agente.', action: 'ASSIGN', moduleCode: ACCESS_MODULE_CODES.ASSIGNMENT },
  { code: PERMISSIONS.TICKET_REASSIGN, name: 'Reasignar tickets', description: 'Cambiar el agente asignado a un ticket.', action: 'REASSIGN', moduleCode: ACCESS_MODULE_CODES.ASSIGNMENT },
  { code: PERMISSIONS.COMMENT_PUBLIC, name: 'Comentar', description: 'Agregar comentarios visibles para el solicitante.', action: 'RESPOND', moduleCode: ACCESS_MODULE_CODES.COMMENTS },
  { code: PERMISSIONS.COMMENT_INTERNAL, name: 'Comentar internamente', description: 'Agregar notas internas no visibles para el solicitante.', action: 'RESPOND', moduleCode: ACCESS_MODULE_CODES.COMMENTS },
  { code: PERMISSIONS.ATTACHMENT_UPLOAD, name: 'Subir adjuntos', description: 'Adjuntar archivos a un ticket.', action: 'CREATE', moduleCode: ACCESS_MODULE_CODES.COMMENTS },
  { code: PERMISSIONS.CATEGORY_MANAGE, name: 'Administrar categorías', description: 'Crear, editar y desactivar categorías.', action: 'MANAGE', moduleCode: ACCESS_MODULE_CODES.CATEGORIES },
  { code: PERMISSIONS.PRIORITY_MANAGE, name: 'Administrar prioridades', description: 'Crear, editar y desactivar prioridades.', action: 'MANAGE', moduleCode: ACCESS_MODULE_CODES.PRIORITIES },
  { code: PERMISSIONS.SLA_MANAGE, name: 'Administrar SLA', description: 'Configurar políticas de tiempos de atención.', action: 'CONFIGURE', moduleCode: ACCESS_MODULE_CODES.SLA },
  { code: PERMISSIONS.DASHBOARD_VIEW, name: 'Ver panel', description: 'Consultar el panel operativo completo.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.DASHBOARD },
  { code: PERMISSIONS.DASHBOARD_VIEW_LIMITED, name: 'Ver panel limitado', description: 'Consultar un panel operativo reducido.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.DASHBOARD },
  { code: PERMISSIONS.CRM_DASHBOARD, name: 'Ver panel CRM', description: 'Consultar indicadores comerciales.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.DASHBOARD },
  { code: PERMISSIONS.REPORT_VIEW, name: 'Ver reportes', description: 'Consultar reportes operativos completos.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.REPORTS },
  { code: PERMISSIONS.REPORT_VIEW_LIMITED, name: 'Ver reportes limitados', description: 'Consultar reportes operativos reducidos.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.REPORTS },
  { code: PERMISSIONS.CRM_EXPORT, name: 'Exportar reportes', description: 'Exportar listados de CRM.', action: 'EXPORT', moduleCode: ACCESS_MODULE_CODES.REPORTS },
  { code: PERMISSIONS.USER_MANAGE, name: 'Administrar usuarios', description: 'Crear, editar, desactivar y restablecer usuarios.', action: 'MANAGE', moduleCode: ACCESS_MODULE_CODES.USERS },
  { code: PERMISSIONS.CRM_CLIENT_VIEW, name: 'Ver clientes', description: 'Consultar el directorio de clientes.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.CRM_CLIENTS },
  { code: PERMISSIONS.CRM_CLIENT_CREATE, name: 'Crear clientes', description: 'Registrar un cliente nuevo.', action: 'CREATE', moduleCode: ACCESS_MODULE_CODES.CRM_CLIENTS },
  { code: PERMISSIONS.CRM_CLIENT_EDIT, name: 'Editar clientes', description: 'Actualizar la información de un cliente.', action: 'EDIT', moduleCode: ACCESS_MODULE_CODES.CRM_CLIENTS },
  { code: PERMISSIONS.CRM_CONTACT_VIEW, name: 'Ver contactos', description: 'Consultar contactos de clientes.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.CRM_CONTACTS },
  { code: PERMISSIONS.CRM_CONTACT_CREATE, name: 'Crear contactos', description: 'Registrar un contacto nuevo.', action: 'CREATE', moduleCode: ACCESS_MODULE_CODES.CRM_CONTACTS },
  { code: PERMISSIONS.CRM_CONTACT_EDIT, name: 'Editar contactos', description: 'Actualizar la información de un contacto.', action: 'EDIT', moduleCode: ACCESS_MODULE_CODES.CRM_CONTACTS },
  { code: PERMISSIONS.CRM_CONTACT_DELETE, name: 'Eliminar contactos', description: 'Quitar un contacto de la cartera sin borrar el cliente ni su información relacionada.', action: 'DELETE', moduleCode: ACCESS_MODULE_CODES.CRM_CONTACTS },
  { code: PERMISSIONS.CRM_OPPORTUNITY_VIEW, name: 'Ver oportunidades', description: 'Consultar el pipeline comercial.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.CRM_OPPORTUNITIES },
  { code: PERMISSIONS.CRM_OPPORTUNITY_CREATE, name: 'Crear oportunidades', description: 'Registrar una oportunidad nueva.', action: 'CREATE', moduleCode: ACCESS_MODULE_CODES.CRM_OPPORTUNITIES },
  { code: PERMISSIONS.CRM_OPPORTUNITY_EDIT, name: 'Editar oportunidades', description: 'Actualizar una oportunidad existente.', action: 'EDIT', moduleCode: ACCESS_MODULE_CODES.CRM_OPPORTUNITIES },
  { code: PERMISSIONS.CRM_OPPORTUNITY_MOVE, name: 'Mover oportunidades', description: 'Cambiar la etapa de una oportunidad.', action: 'EDIT', moduleCode: ACCESS_MODULE_CODES.CRM_OPPORTUNITIES },
  { code: PERMISSIONS.CRM_ACTIVITY_VIEW, name: 'Ver actividades', description: 'Consultar actividades comerciales.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.CRM_ACTIVITIES },
  { code: PERMISSIONS.CRM_ACTIVITY_CREATE, name: 'Crear actividades', description: 'Registrar una actividad comercial.', action: 'CREATE', moduleCode: ACCESS_MODULE_CODES.CRM_ACTIVITIES },
  { code: PERMISSIONS.CRM_ACTIVITY_EDIT, name: 'Editar actividades', description: 'Actualizar o completar una actividad.', action: 'EDIT', moduleCode: ACCESS_MODULE_CODES.CRM_ACTIVITIES },
  { code: PERMISSIONS.CRM_SURVEY_VIEW, name: 'Ver encuestas', description: 'Consultar encuestas CRM.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.CRM_SURVEYS },
  { code: PERMISSIONS.CRM_SURVEY_MANAGE, name: 'Administrar encuestas', description: 'Crear, publicar y editar encuestas CRM.', action: 'MANAGE', moduleCode: ACCESS_MODULE_CODES.CRM_SURVEYS },
  { code: PERMISSIONS.CRM_SURVEY_RESULTS, name: 'Ver resultados de encuestas', description: 'Consultar resultados agregados de encuestas.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.CRM_RESULTS },
  { code: PERMISSIONS.CRM_RESPONSE_VIEW, name: 'Ver respuestas', description: 'Consultar respuestas individuales de encuestas.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.CRM_RESULTS },
  { code: PERMISSIONS.KNOWLEDGE_MANAGE, name: 'Administrar conocimiento', description: 'Crear y editar artículos de ayuda.', action: 'MANAGE', moduleCode: ACCESS_MODULE_CODES.KNOWLEDGE },
  { code: PERMISSIONS.ROLE_VIEW, name: 'Ver roles', description: 'Consultar roles y la cantidad de privilegios asignados.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.ADMINISTRATION },
  { code: PERMISSIONS.ROLE_PERMISSION_MANAGE, name: 'Administrar privilegios', description: 'Modificar los permisos asignados a cada rol.', action: 'MANAGE', moduleCode: ACCESS_MODULE_CODES.ADMINISTRATION },
  { code: PERMISSIONS.MODULE_VIEW, name: 'Ver módulos', description: 'Consultar módulos configurables de la plataforma.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.ADMINISTRATION },
  { code: PERMISSIONS.MODULE_MANAGE, name: 'Administrar módulos', description: 'Activar o desactivar módulos configurables.', action: 'CONFIGURE', moduleCode: ACCESS_MODULE_CODES.ADMINISTRATION },
  { code: PERMISSIONS.PERMISSION_AUDIT_VIEW, name: 'Ver historial de privilegios', description: 'Consultar quién modificó privilegios o módulos.', action: 'VIEW', moduleCode: ACCESS_MODULE_CODES.ADMINISTRATION },
] as const

export function nextRolePermissionCodes(input: {
  isNewRole: boolean
  existingCodes: string[]
  defaultCodes: readonly string[]
  newlyCreatedCodes: string[]
}): string[] | null {
  if (input.isNewRole || input.existingCodes.length === 0) {
    return [...input.defaultCodes]
  }
  const extras = input.newlyCreatedCodes.filter(
    (code) => input.defaultCodes.includes(code) && !input.existingCodes.includes(code),
  )
  return extras.length ? [...input.existingCodes, ...extras] : null
}
