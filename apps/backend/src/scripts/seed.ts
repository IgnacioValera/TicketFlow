import 'reflect-metadata'
import bcrypt from 'bcryptjs'
import { ROLE_PERMISSION_CODES, PERMISSIONS } from '../common/permissions'
import AppDataSource from '../database/data-source'
import { CatalogStatus, Category, Company, CompanyTier, KnowledgeArticle, Permission, Priority, PriorityLevel, Role, RoleCode, SatisfactionSurvey, SlaPolicy, Ticket, TicketComment, TicketCounter, TicketHistory, TicketStatus, User } from '../database/entities'

async function seed() {
  await AppDataSource.initialize()
  const permissionRepo = AppDataSource.getRepository(Permission), roleRepo = AppDataSource.getRepository(Role), userRepo = AppDataSource.getRepository(User)
  const permissionMap = new Map<string, Permission>()
  for (const code of Object.values(PERMISSIONS)) {
    let permission = await permissionRepo.findOneBy({ code })
    if (!permission) permission = await permissionRepo.save(permissionRepo.create({ code, name: code.replaceAll('_', ' ') }))
    permissionMap.set(code, permission)
  }
  const roleNames: Record<RoleCode, string> = { ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', AGENT: 'Agente', REQUESTER: 'Solicitante' }
  const roles = new Map<RoleCode, Role>()
  for (const code of Object.values(RoleCode)) {
    let role = await roleRepo.findOne({ where: { code }, relations: { permissions: true } })
    if (!role) role = roleRepo.create({ code, name: roleNames[code] })
    role.permissions = [...ROLE_PERMISSION_CODES[code]].map((permission) => permissionMap.get(permission)!)
    roles.set(code, await roleRepo.save(role))
  }
  const passwordHash = await bcrypt.hash('password', 12)
  const userSeeds = [
    ['Admin Sistema', 'admin@helpdesk.com', RoleCode.ADMIN], ['Agente Soporte', 'agent@helpdesk.com', RoleCode.AGENT],
    ['Supervisor Mesa', 'supervisor@helpdesk.com', RoleCode.SUPERVISOR], ['Usuario Solicitante', 'requester@helpdesk.com', RoleCode.REQUESTER],
  ] as const
  const users = new Map<RoleCode, User>()
  for (const [fullName, email, roleCode] of userSeeds) { let user = await userRepo.findOne({ where: { email }, relations: { role: true } }); if (!user) user = await userRepo.save(userRepo.create({ fullName, email, passwordHash, role: roles.get(roleCode)!, lastLoginAt: null })); users.set(roleCode, user) }

  const categoryRepo = AppDataSource.getRepository(Category)
  const categories = new Map<string, Category>()
  for (const [name, description] of [['Hardware','Incidentes y solicitudes de equipos de cómputo'],['Software','Aplicaciones corporativas y licenciamiento'],['Accesos','Altas, bajas y cambios de permisos']]) { let item = await categoryRepo.findOneBy({ name }); if (!item) item = await categoryRepo.save(categoryRepo.create({ name, description })); categories.set(name, item) }
  const priorityRepo = AppDataSource.getRepository(Priority), policyRepo = AppDataSource.getRepository(SlaPolicy)
  const priorities = new Map<PriorityLevel, Priority>()
  const prioritySeeds: Array<[string, PriorityLevel, string, string, number, number]> = [['Baja',PriorityLevel.LOW,'#94a3b8','Impacto mínimo en operaciones',24,72],['Media',PriorityLevel.MEDIUM,'#247b7b','Afecta parcialmente el trabajo',8,48],['Alta',PriorityLevel.HIGH,'#f97316','Interrumpe procesos importantes',4,24],['Crítica',PriorityLevel.CRITICAL,'#db3a34','Detiene operaciones críticas',1,8]]
  for (const [name, level, color, description, responseHours, resolutionHours] of prioritySeeds) { let priority = await priorityRepo.findOneBy({ level }); if (!priority) priority = await priorityRepo.save(priorityRepo.create({ name, level, color, description })); priorities.set(level, priority); if (!await policyRepo.exists({ where: { priority: { id: priority.id } } })) await policyRepo.save(policyRepo.create({ name: `SLA ${name}`, priority, responseHours, resolutionHours })) }
  const companyRepo = AppDataSource.getRepository(Company)
  const companySeeds: Array<[string,string,string,CompanyTier,string,string]> = [['Acme Corp','Finanzas','Norte',CompanyTier.GOLD,'soporte@acme.com','+52 81 1234 5678'],['Globex','Retail','Centro',CompanyTier.SILVER,'it@globex.com','+52 55 8765 4321'],['Initech','Tecnología','Sur',CompanyTier.PLATINUM,'mesa@initech.com','+52 33 2468 1357']]
  for (const [name,industry,region,tier,contactEmail,contactPhone] of companySeeds) if (!await companyRepo.exists({ where: { name } })) await companyRepo.save(companyRepo.create({ name,industry,region,tier,contactEmail,contactPhone }))

  const ticketRepo = AppDataSource.getRepository(Ticket)
  if (await ticketRepo.count() === 0) {
    const now = Date.now(), requester = users.get(RoleCode.REQUESTER)!, agent = users.get(RoleCode.AGENT)!, supervisor = users.get(RoleCode.SUPERVISOR)!, company = await companyRepo.findOneByOrFail({ name: 'Acme Corp' })
    const seeds: Array<[string,string,TicketStatus,Category,Priority,number,User|null,Company|null]> = [
      ['No puedo acceder al sistema de nómina','Credenciales inválidas después de restablecer la contraseña.',TicketStatus.OPEN,categories.get('Software')!,priorities.get(PriorityLevel.HIGH)!,2,null,null],
      ['Impresora no responde','La impresora del piso 3 no imprime documentos.',TicketStatus.ASSIGNED,categories.get('Hardware')!,priorities.get(PriorityLevel.MEDIUM)!,20,agent,null],
      ['Error en módulo de reportes','El dashboard muestra error 500 al exportar.',TicketStatus.IN_PROGRESS,categories.get('Software')!,priorities.get(PriorityLevel.CRITICAL)!,6,agent,company],
      ['Solicitud de acceso VPN','Nuevo colaborador requiere acceso VPN.',TicketStatus.RESOLVED,categories.get('Accesos')!,priorities.get(PriorityLevel.MEDIUM)!,48,agent,null],
      ['Servidor de archivos caído','No hay acceso al recurso compartido corporativo.',TicketStatus.ESCALATED,categories.get('Hardware')!,priorities.get(PriorityLevel.CRITICAL)!,10,agent,company],
    ]
    let number = 0
    for (const [title,description,status,category,priority,hoursAgo,assignee,companyValue] of seeds) { number++; const createdAt = new Date(now-hoursAgo*3600000); const policy = await policyRepo.findOneByOrFail({ priority: { id: priority.id } }); const ticket = await ticketRepo.save(ticketRepo.create({ folio:`HD-${new Date().getFullYear()}-${String(number).padStart(4,'0')}`,title,description,status,category,priority,requester,assignee,company:companyValue,slaCreatedAt:createdAt,slaDueAt:new Date(createdAt.getTime()+policy.resolutionHours*3600000),resolutionHours:policy.resolutionHours,closedAt:null,createdAt })); await AppDataSource.getRepository(TicketHistory).save(AppDataSource.getRepository(TicketHistory).create({ ticket,changedBy:status===TicketStatus.OPEN?requester:supervisor,eventType:'CREATED',oldStatus:null,newStatus:status,reason:null,details:null,createdAt })) }
    await AppDataSource.getRepository(TicketCounter).save(AppDataSource.getRepository(TicketCounter).create({ year:new Date().getFullYear(), value:number }))
    const assigned = await ticketRepo.findOneByOrFail({ status: TicketStatus.ASSIGNED }); await AppDataSource.getRepository(TicketComment).save(AppDataSource.getRepository(TicketComment).create({ ticket:assigned,author:agent,body:'Revisaré el equipo esta tarde.',isInternal:false }))
  }
  const articleRepo = AppDataSource.getRepository(KnowledgeArticle)
  if (await articleRepo.count() === 0) await articleRepo.save(articleRepo.create({ title:'Cómo restablecer la contraseña', content:'Desde la pantalla de inicio de sesión selecciona “Olvidé mi contraseña”, confirma tu correo institucional y sigue el enlace recibido.', tags:'contraseña,acceso,cuenta', category:categories.get('Accesos')!, author:users.get(RoleCode.AGENT)!, status:CatalogStatus.ACTIVE }))
  await AppDataSource.destroy()
  process.stdout.write('Datos semilla creados correctamente.\n')
}
seed().catch(async (error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); if (AppDataSource.isInitialized) await AppDataSource.destroy(); process.exit(1) })
