import 'reflect-metadata'
import bcrypt from 'bcryptjs'
import { ROLE_PERMISSION_CODES, PERMISSIONS } from '../common/permissions'
import AppDataSource from '../database/data-source'
import {
  ActivityStatus, ActivityType, CatalogStatus, Category, Client, ClientSegment, ClientStatus, CompanyTier,
  CrmActivity, CrmContact, CrmOpportunity, CrmOpportunityStageHistory, CrmSurvey, CrmSurveyAnswer, CrmSurveyInvitation,
  CrmSurveyQuestion, CrmSurveyQuestionOption, CrmSurveyResponse, KnowledgeArticle, OpportunityStage, Permission, Priority,
  PriorityLevel, Role, RoleCode, SlaPolicy, SurveyQuestionType, SurveyStatus, SurveyTrigger, Ticket, TicketComment,
  TicketCounter, TicketHistory, TicketStatus, User,
} from '../database/entities'
import { KNOWLEDGE_SEED_ARTICLES } from '../knowledge/articles.seed'
import { hashSurveyToken, invitationExpiry } from '../crm/survey-token'

async function seed() {
  await AppDataSource.initialize()
  const permissionRepo = AppDataSource.getRepository(Permission), roleRepo = AppDataSource.getRepository(Role), userRepo = AppDataSource.getRepository(User)
  const permissionMap = new Map<string, Permission>()
  for (const code of Object.values(PERMISSIONS)) {
    let permission = await permissionRepo.findOneBy({ code })
    if (!permission) permission = await permissionRepo.save(permissionRepo.create({ code, name: code.replaceAll('_', ' ') }))
    permissionMap.set(code, permission)
  }
  const roleNames: Record<RoleCode, string> = {
    ADMIN: 'Administrador', SALES: 'Ejecutivo comercial', SUPERVISOR: 'Supervisor', AGENT: 'Agente de soporte',
    CLIENT: 'Cliente portal', REQUESTER: 'Solicitante',
  }
  const roles = new Map<RoleCode, Role>()
  for (const code of Object.values(RoleCode)) {
    let role = await roleRepo.findOne({ where: { code }, relations: { permissions: true } })
    if (!role) role = roleRepo.create({ code, name: roleNames[code] })
    role.name = roleNames[code]
    role.permissions = [...ROLE_PERMISSION_CODES[code]].map((permission) => permissionMap.get(permission)!)
    roles.set(code, await roleRepo.save(role))
  }
  const passwordHash = await bcrypt.hash('password', 12)
  const userSeeds: Array<[string, string, RoleCode]> = [
    ['Admin Sistema', 'admin@helpdesk.com', RoleCode.ADMIN],
    ['Agente Soporte', 'agent@helpdesk.com', RoleCode.AGENT],
    ['Supervisor Mesa', 'supervisor@helpdesk.com', RoleCode.SUPERVISOR],
    ['Usuario Solicitante', 'requester@helpdesk.com', RoleCode.CLIENT],
    ['Ejecutivo Comercial', 'sales@helpdesk.com', RoleCode.SALES],
  ]
  const users = new Map<RoleCode, User>()
  for (const [fullName, email, roleCode] of userSeeds) {
    let user = await userRepo.findOne({ where: { email }, relations: { role: true } })
    if (!user) user = await userRepo.save(userRepo.create({ fullName, email, passwordHash, role: roles.get(roleCode)!, lastLoginAt: null }))
    else if (user.role.code !== roleCode) { user.role = roles.get(roleCode)!; user = await userRepo.save(user) }
    users.set(roleCode, user)
  }

  const categoryRepo = AppDataSource.getRepository(Category)
  const categories = new Map<string, Category>()
  for (const [name, description] of [['Hardware','Incidentes y solicitudes de equipos de cómputo'],['Software','Aplicaciones corporativas y licenciamiento'],['Accesos','Altas, bajas y cambios de permisos']]) {
    let item = await categoryRepo.findOneBy({ name }); if (!item) item = await categoryRepo.save(categoryRepo.create({ name, description })); categories.set(name, item)
  }
  const priorityRepo = AppDataSource.getRepository(Priority), policyRepo = AppDataSource.getRepository(SlaPolicy)
  const priorities = new Map<PriorityLevel, Priority>()
  const prioritySeeds: Array<[string, PriorityLevel, string, string, number, number]> = [['Baja',PriorityLevel.LOW,'#94a3b8','Impacto mínimo en operaciones',24,72],['Media',PriorityLevel.MEDIUM,'#247b7b','Afecta parcialmente el trabajo',8,48],['Alta',PriorityLevel.HIGH,'#f97316','Interrumpe procesos importantes',4,24],['Crítica',PriorityLevel.CRITICAL,'#db3a34','Detiene operaciones críticas',1,8]]
  for (const [name, level, color, description, responseHours, resolutionHours] of prioritySeeds) {
    let priority = await priorityRepo.findOneBy({ level }); if (!priority) priority = await priorityRepo.save(priorityRepo.create({ name, level, color, description })); priorities.set(level, priority)
    if (!await policyRepo.exists({ where: { priority: { id: priority.id } } })) await policyRepo.save(policyRepo.create({ name: `SLA ${name}`, priority, responseHours, resolutionHours }))
  }

  const clientRepo = AppDataSource.getRepository(Client)
  const sales = users.get(RoleCode.SALES)!
  const clientSeeds: Array<[string, string, string, CompanyTier, ClientSegment, string, string, ClientStatus]> = [
    ['Acme Corp','Finanzas','Norte',CompanyTier.GOLD,ClientSegment.ENTERPRISE,'soporte@acme.com','+52 81 1234 5678',ClientStatus.ACTIVE],
    ['Globex','Retail','Centro',CompanyTier.SILVER,ClientSegment.MID_MARKET,'it@globex.com','+52 55 8765 4321',ClientStatus.ACTIVE],
    ['Initech','Tecnología','Sur',CompanyTier.PLATINUM,ClientSegment.ENTERPRISE,'mesa@initech.com','+52 33 2468 1357',ClientStatus.ACTIVE],
    ['Umbrella Salud','Salud','Occidente',CompanyTier.GOLD,ClientSegment.MID_MARKET,'contacto@umbrella.mx','+52 33 1111 2222',ClientStatus.ACTIVE],
    ['Soylent Foods','Alimentos','Bajío',CompanyTier.BRONZE,ClientSegment.SMB,'ventas@soylent.mx','+52 477 333 4444',ClientStatus.PROSPECT],
  ]
  const clients = new Map<string, Client>()
  for (const [name, industry, region, tier, segment, email, phone, status] of clientSeeds) {
    let client = await clientRepo.findOneBy({ name })
    if (!client) client = await clientRepo.save(clientRepo.create({ name, industry, region, tier, segment, email, phone, status, owner: sales, score: 50 }))
    else {
      client.segment = segment; client.status = status; client.email = email; client.phone = phone; client.owner = sales
      client = await clientRepo.save(client)
    }
    clients.set(name, client)
  }

  const ticketRepo = AppDataSource.getRepository(Ticket)
  if (await ticketRepo.count() === 0) {
    const now = Date.now(), requester = users.get(RoleCode.CLIENT)!, agent = users.get(RoleCode.AGENT)!, supervisor = users.get(RoleCode.SUPERVISOR)!, acme = clients.get('Acme Corp')!
    const seeds: Array<[string,string,TicketStatus,Category,Priority,number,User|null,Client|null]> = [
      ['No puedo acceder al sistema de nómina','Credenciales inválidas después de restablecer la contraseña.',TicketStatus.OPEN,categories.get('Software')!,priorities.get(PriorityLevel.HIGH)!,2,null,null],
      ['Impresora no responde','La impresora del piso 3 no imprime documentos.',TicketStatus.ASSIGNED,categories.get('Hardware')!,priorities.get(PriorityLevel.MEDIUM)!,20,agent,null],
      ['Error en módulo de reportes','El dashboard muestra error 500 al exportar.',TicketStatus.IN_PROGRESS,categories.get('Software')!,priorities.get(PriorityLevel.CRITICAL)!,6,agent,acme],
      ['Solicitud de acceso VPN','Nuevo colaborador requiere acceso VPN.',TicketStatus.RESOLVED,categories.get('Accesos')!,priorities.get(PriorityLevel.MEDIUM)!,48,agent,null],
      ['Servidor de archivos caído','No hay acceso al recurso compartido corporativo.',TicketStatus.ESCALATED,categories.get('Hardware')!,priorities.get(PriorityLevel.CRITICAL)!,10,agent,acme],
    ]
    let number = 0
    for (const [title,description,status,category,priority,hoursAgo,assignee,clientValue] of seeds) {
      number++; const createdAt = new Date(now-hoursAgo*3600000); const policy = await policyRepo.findOneByOrFail({ priority: { id: priority.id } })
      const ticket = await ticketRepo.save(ticketRepo.create({ folio:`HD-${new Date().getFullYear()}-${String(number).padStart(4,'0')}`,title,description,status,category,priority,requester,assignee,client:clientValue,slaCreatedAt:createdAt,slaDueAt:new Date(createdAt.getTime()+policy.resolutionHours*3600000),resolutionHours:policy.resolutionHours,closedAt:null,createdAt }))
      await AppDataSource.getRepository(TicketHistory).save(AppDataSource.getRepository(TicketHistory).create({ ticket,changedBy:status===TicketStatus.OPEN?requester:supervisor,eventType:'CREATED',oldStatus:null,newStatus:status,reason:null,details:null,createdAt }))
    }
    await AppDataSource.getRepository(TicketCounter).save(AppDataSource.getRepository(TicketCounter).create({ year:new Date().getFullYear(), value:number }))
    const assigned = await ticketRepo.findOneByOrFail({ status: TicketStatus.ASSIGNED }); await AppDataSource.getRepository(TicketComment).save(AppDataSource.getRepository(TicketComment).create({ ticket:assigned,author:users.get(RoleCode.AGENT)!,body:'Revisaré el equipo esta tarde.',isInternal:false }))
  }

  const articleRepo = AppDataSource.getRepository(KnowledgeArticle)
  const author = users.get(RoleCode.ADMIN) ?? users.get(RoleCode.AGENT)!
  for (const article of KNOWLEDGE_SEED_ARTICLES) {
    const category = article.categoryName ? categories.get(article.categoryName) ?? null : null
    let existing = await articleRepo.findOne({ where: { title: article.title } })
    if (!existing) {
      existing = articleRepo.create({
        title: article.title,
        content: article.content,
        tags: article.tags,
        category,
        author,
        status: CatalogStatus.ACTIVE,
      })
    } else {
      existing.content = article.content
      existing.tags = article.tags
      existing.category = category
      existing.status = CatalogStatus.ACTIVE
    }
    await articleRepo.save(existing)
  }

  const contactRepo = AppDataSource.getRepository(CrmContact)
  if (await contactRepo.count() === 0) {
    const contactSeeds: Array<[string, string, string, string, string, string, boolean]> = [
      ['Acme Corp','Laura','Reyes','laura.reyes@acme.com','+52 81 1000 0001','CTO',true],
      ['Acme Corp','Diego','Paz','diego.paz@acme.com','+52 81 1000 0002','Compras',false],
      ['Globex','Marta','Solís','marta.solis@globex.com','+52 55 2000 0001','Gerente TI',true],
      ['Initech','Héctor','Nava','hector.nava@initech.com','+52 33 3000 0001','Director',true],
      ['Initech','Ana','Cruz','ana.cruz@initech.com','+52 33 3000 0002','Operaciones',false],
      ['Umbrella Salud','Patricia','León','patricia.leon@umbrella.mx','+52 33 4000 0001','Compras',true],
      ['Soylent Foods','Iván','Mora','ivan.mora@soylent.mx','+52 477 5000 0001','Fundador',true],
      ['Globex','Sofía','Ríos','sofia.rios@globex.com','+52 55 2000 0002','Finanzas',false],
    ]
    for (const [clientName, firstName, lastName, email, phone, jobTitle, isPrimary] of contactSeeds) {
      await contactRepo.save(contactRepo.create({ client: clients.get(clientName)!, firstName, lastName, email, phone, jobTitle, isPrimary }))
    }
  }
  const contacts = await contactRepo.find({ relations: { client: true } })
  const contactOf = (clientName: string) => contacts.find((item) => item.client.name === clientName && item.isPrimary) ?? contacts.find((item) => item.client.name === clientName)!

  const oppRepo = AppDataSource.getRepository(CrmOpportunity)
  const historyRepo = AppDataSource.getRepository(CrmOpportunityStageHistory)
  if (await oppRepo.count() === 0) {
    const oppSeeds: Array<[string, string, OpportunityStage, number, number]> = [
      ['Acme Corp','Renovación ERP',OpportunityStage.NEW,120000,10],
      ['Acme Corp','Módulo nómina cloud',OpportunityStage.QUALIFICATION,85000,25],
      ['Globex','Soporte 24/7',OpportunityStage.PROPOSAL,45000,50],
      ['Globex','Integración POS',OpportunityStage.NEGOTIATION,62000,75],
      ['Initech','Help desk enterprise',OpportunityStage.WON,210000,100],
      ['Initech','Capacitación agentes',OpportunityStage.LOST,18000,0],
      ['Umbrella Salud','Portal pacientes',OpportunityStage.QUALIFICATION,97000,25],
      ['Umbrella Salud','SLA crítico',OpportunityStage.PROPOSAL,54000,50],
      ['Soylent Foods','Onboarding SMB',OpportunityStage.NEW,12000,10],
      ['Soylent Foods','Encuestas NPS',OpportunityStage.NEGOTIATION,22000,75],
      ['Acme Corp','Knowledge base',OpportunityStage.PROPOSAL,33000,50],
    ]
    for (const [clientName, title, stage, amount, probability] of oppSeeds) {
      const opportunity = await oppRepo.save(oppRepo.create({
        client: clients.get(clientName)!, contact: contactOf(clientName), owner: sales, title, amount, currency: 'MXN',
        probability, stage, expectedCloseDate: '2026-12-15', lostReason: stage === OpportunityStage.LOST ? 'Presupuesto insuficiente' : null, notes: '',
      }))
      await historyRepo.save(historyRepo.create({ opportunity, changedBy: sales, oldStage: null, newStage: stage, reason: 'Seed' }))
    }
  }

  const activityRepo = AppDataSource.getRepository(CrmActivity)
  if (await activityRepo.count() === 0) {
    const opps = await oppRepo.find({ relations: { client: true, contact: true } })
    const types = [ActivityType.CALL, ActivityType.MEETING, ActivityType.TASK, ActivityType.NOTE]
    for (let i = 0; i < 16; i++) {
      const opportunity = opps[i % opps.length]
      const status = i % 3 === 0 ? ActivityStatus.COMPLETED : i % 5 === 0 ? ActivityStatus.CANCELLED : ActivityStatus.PENDING
      await activityRepo.save(activityRepo.create({
        client: opportunity.client, opportunity, contact: opportunity.contact, owner: sales, type: types[i % types.length], status,
        subject: `Seguimiento ${i + 1} ${opportunity.title}`, body: 'Actividad de demostración CRM.',
        dueAt: new Date(Date.now() + (i - 4) * 86400000), completedAt: status === ActivityStatus.COMPLETED ? new Date() : null,
      }))
    }
  }

  const surveyRepo = AppDataSource.getRepository(CrmSurvey)
  const questionRepo = AppDataSource.getRepository(CrmSurveyQuestion)
  const optionRepo = AppDataSource.getRepository(CrmSurveyQuestionOption)
  if (await surveyRepo.count() === 0) {
    const satisfaction = await surveyRepo.save(surveyRepo.create({
      title: 'Satisfacción post-venta', description: 'Evalúa la experiencia comercial.', status: SurveyStatus.PUBLISHED,
      trigger: SurveyTrigger.OPPORTUNITY_WON, createdBy: sales,
    }))
    const npsSurvey = await surveyRepo.save(surveyRepo.create({
      title: 'NPS de cliente', description: '¿Qué tan probable es que nos recomiendes?', status: SurveyStatus.PUBLISHED,
      trigger: SurveyTrigger.MANUAL, createdBy: sales,
    }))
    const q1 = await questionRepo.save(questionRepo.create({ survey: satisfaction, prompt: '¿Cómo calificarías la atención comercial?', type: SurveyQuestionType.RATING, required: true, position: 0 }))
    await questionRepo.save(questionRepo.create({ survey: satisfaction, prompt: '¿Qué podemos mejorar?', type: SurveyQuestionType.TEXT, required: false, position: 1 }))
    const qNps = await questionRepo.save(questionRepo.create({ survey: npsSurvey, prompt: 'Del 0 al 10, ¿qué tan probable es que nos recomiendes?', type: SurveyQuestionType.NPS, required: true, position: 0 }))
    const yesNo = await questionRepo.save(questionRepo.create({ survey: npsSurvey, prompt: '¿Volverías a contratar?', type: SurveyQuestionType.YES_NO, required: true, position: 1 }))
    await optionRepo.save(optionRepo.create({ question: yesNo, label: 'Sí', value: 'yes', position: 0 }))
    await optionRepo.save(optionRepo.create({ question: yesNo, label: 'No', value: 'no', position: 1 }))

    const won = await oppRepo.findOneOrFail({ where: { stage: OpportunityStage.WON }, relations: { client: true, contact: true } })
    const invitationRepo = AppDataSource.getRepository(CrmSurveyInvitation)
    const rawSat = 'demo-won-satisfaction-token'
    const invitation = await invitationRepo.save(invitationRepo.create({
      survey: satisfaction, opportunity: won, contact: won.contact, client: won.client,
      createdBy: sales, trigger: SurveyTrigger.OPPORTUNITY_WON,
      tokenHash: hashSurveyToken(rawSat), expiresAt: invitationExpiry(), usedAt: new Date(), revokedAt: null,
    }))
    const responseRepo = AppDataSource.getRepository(CrmSurveyResponse)
    const answerRepo = AppDataSource.getRepository(CrmSurveyAnswer)
    const response = await responseRepo.save(responseRepo.create({ invitation, survey: satisfaction, npsScore: null }))
    await answerRepo.save(answerRepo.create({ response, question: q1, textValue: null, numberValue: 5, optionIds: null }))

    const rawNps = 'demo-nps-token'
    const npsInvitation = await invitationRepo.save(invitationRepo.create({
      survey: npsSurvey, opportunity: null, contact: won.contact, client: won.client,
      createdBy: sales, trigger: SurveyTrigger.MANUAL,
      tokenHash: hashSurveyToken(rawNps), expiresAt: invitationExpiry(), usedAt: new Date(), revokedAt: null,
    }))
    const npsResponse = await responseRepo.save(responseRepo.create({ invitation: npsInvitation, survey: npsSurvey, npsScore: 9 }))
    await answerRepo.save(answerRepo.create({ response: npsResponse, question: qNps, textValue: null, numberValue: 9, optionIds: null }))
  }

  await AppDataSource.destroy()
  process.stdout.write('Datos semilla creados correctamente.\n')
}
seed().catch(async (error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); if (AppDataSource.isInitialized) await AppDataSource.destroy(); process.exit(1) })
