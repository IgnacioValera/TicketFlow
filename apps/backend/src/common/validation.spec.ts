import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { LoginDto } from '../auth/dto'
import { CreateSlaPolicyDto, CreateCategoryDto } from '../catalogs/dto'
import { CreateTicketDto, ChangeStatusDto, CreateCommentDto } from '../tickets/dto'
import { CreateUserDto } from '../users/dto'
import { CreateArticleDto } from '../knowledge/knowledge.module'
import { DateRangeQuery } from '../analytics/analytics.controller'
import { CreateOpportunityDto, CreateSurveyDto } from '../crm/dto'
import { RoleCode, TicketStatus } from '../database/entities'

function dtoErrors(errors: { property: string; constraints?: Record<string, string> }[]) {
  return errors.flatMap((error) => Object.values(error.constraints ?? {}))
}

function createDto<T>(cls: new () => T, data: object) {
  return plainToInstance(cls, data)
}

describe('Validación de DTOs', () => {
  it('rechaza título de ticket formado solo por espacios', async () => {
    const dto = createDto(CreateTicketDto, {
      title: '    ',
      description: 'Descripción válida de ticket',
      categoryId: '11111111-1111-4111-8111-111111111111',
      priorityId: '22222222-2222-4222-8222-222222222222',
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('título'))).toBe(true)
  })

  it('rechaza título que supera el límite de 200 caracteres', async () => {
    const dto = createDto(CreateTicketDto, {
      title: 'A'.repeat(201),
      description: 'Descripción válida de ticket',
      categoryId: '11111111-1111-4111-8111-111111111111',
      priorityId: '22222222-2222-4222-8222-222222222222',
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.includes('200'))).toBe(true)
  })

  it('rechaza UUID inválido en categoría', async () => {
    const dto = createDto(CreateTicketDto, {
      title: 'Título válido',
      description: 'Descripción válida de ticket',
      categoryId: 'no-es-uuid',
      priorityId: '22222222-2222-4222-8222-222222222222',
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('uuid'))).toBe(true)
  })

  it('rechaza comentario formado solo por espacios', async () => {
    const dto = createDto(CreateCommentDto, { body: '   ' })
    expect((await validate(dto)).length).toBeGreaterThan(0)
  })

  it('exige motivo al cancelar', async () => {
    const dto = createDto(ChangeStatusDto, { status: TicketStatus.CANCELLED })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('motivo'))).toBe(true)
  })

  it('rechaza motivo formado solo por espacios al resolver', async () => {
    const dto = createDto(ChangeStatusDto, { status: TicketStatus.RESOLVED, reason: '    ' })
    expect((await validate(dto)).length).toBeGreaterThan(0)
  })

  it('acepta un ticket válido tras trim', async () => {
    const dto = createDto(CreateTicketDto, {
      title: '  Incidente de red  ',
      description: '  El acceso VPN falló en sucursal  ',
      categoryId: '11111111-1111-4111-8111-111111111111',
      priorityId: '22222222-2222-4222-8222-222222222222',
    })
    expect(await validate(dto)).toHaveLength(0)
  })

  it('rechaza categoría de catálogo con nombre vacío', async () => {
    const dto = createDto(CreateCategoryDto, { name: '  ' })
    expect((await validate(dto)).length).toBeGreaterThan(0)
  })

  it('rechaza rango de fechas invertido', async () => {
    const dto = createDto(DateRangeQuery, { startDate: '2026-08-10', endDate: '2026-08-01' })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('fecha'))).toBe(true)
  })

  it('acepta rango de fechas válido', async () => {
    const dto = createDto(DateRangeQuery, { startDate: '2026-08-01', endDate: '2026-08-10' })
    expect(await validate(dto)).toHaveLength(0)
  })

  it('rechaza SLA con resolución menor que respuesta', async () => {
    const dto = createDto(CreateSlaPolicyDto, {
      name: 'Crítica',
      priorityId: '11111111-1111-4111-8111-111111111111',
      responseHours: 8,
      resolutionHours: 4,
    })
    expect((await validate(dto)).length).toBeGreaterThan(0)
  })

  it('rechaza contraseña sin mayúscula', async () => {
    const dto = createDto(CreateUserDto, {
      fullName: 'Ana Pérez',
      email: 'ana@helpdesk.com',
      password: 'password1!',
      role: RoleCode.AGENT,
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('mayúscula'))).toBe(true)
  })

  it('rechaza contraseña sin minúscula', async () => {
    const dto = createDto(CreateUserDto, {
      fullName: 'Ana Pérez',
      email: 'ana@helpdesk.com',
      password: 'PASSWORD1!',
      role: RoleCode.AGENT,
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('minúscula'))).toBe(true)
  })

  it('rechaza contraseña sin número', async () => {
    const dto = createDto(CreateUserDto, {
      fullName: 'Ana Pérez',
      email: 'ana@helpdesk.com',
      password: 'Password!',
      role: RoleCode.AGENT,
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('número'))).toBe(true)
  })

  it('rechaza contraseña sin símbolo', async () => {
    const dto = createDto(CreateUserDto, {
      fullName: 'Ana Pérez',
      email: 'ana@helpdesk.com',
      password: 'Password1',
      role: RoleCode.AGENT,
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('símbolo'))).toBe(true)
  })

  it('acepta una contraseña válida', async () => {
    const dto = createDto(CreateUserDto, {
      fullName: 'Ana Pérez',
      email: 'ana@helpdesk.com',
      password: 'Password1!',
      role: RoleCode.AGENT,
    })
    expect(await validate(dto)).toHaveLength(0)
  })

  it('rechaza un nombre vacío o con solo espacios', async () => {
    const dto = createDto(CreateUserDto, {
      fullName: '   ',
      email: 'ana@helpdesk.com',
      password: 'Password1!',
      role: RoleCode.AGENT,
    })
    expect((await validate(dto)).length).toBeGreaterThan(0)
  })

  it('rechaza un correo inválido', async () => {
    const dto = createDto(CreateUserDto, {
      fullName: 'Ana Pérez',
      email: 'no-es-correo',
      password: 'Password1!',
      role: RoleCode.AGENT,
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('correo'))).toBe(true)
  })

  it('normaliza el correo a minúsculas y sin espacios', () => {
    const dto = createDto(CreateUserDto, {
      fullName: 'Ana Pérez',
      email: '  Ana@HelpDesk.COM  ',
      password: 'Password1!',
      role: RoleCode.AGENT,
    })
    expect(dto.email).toBe('ana@helpdesk.com')
  })

  it('rechaza un rol fuera de los administrables', async () => {
    const dto = createDto(CreateUserDto, {
      fullName: 'Ana Pérez',
      email: 'ana@helpdesk.com',
      password: 'Password1!',
      role: 'FOO',
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('rol'))).toBe(true)
  })

  it('permite login con password de usuarios existentes sin complejidad', async () => {
    const dto = createDto(LoginDto, { email: 'admin@helpdesk.com', password: 'password' })
    expect(await validate(dto)).toHaveLength(0)
  })

  it('normaliza el correo de login y no exige complejidad', () => {
    const dto = createDto(LoginDto, { email: '  Admin@HelpDesk.COM  ', password: 'password' })
    expect(dto.email).toBe('admin@helpdesk.com')
  })

  it('rechaza artículo con categoría UUID inválido', async () => {
    const dto = createDto(CreateArticleDto, {
      title: 'Guía de VPN',
      content: 'Contenido suficientemente largo para el artículo',
      categoryId: 'no-uuid',
    })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('uuid'))).toBe(true)
  })

  it('rechaza oportunidad sin título ni cliente', async () => {
    const dto = createDto(CreateOpportunityDto, { title: '   ', amount: -10, clientId: 'no-uuid' })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('título'))).toBe(true)
    expect(messages.some((message) => message.toLowerCase().includes('uuid'))).toBe(true)
  })

  it('rechaza encuesta con título vacío', async () => {
    const dto = createDto(CreateSurveyDto, { title: '   ' })
    const messages = dtoErrors(await validate(dto))
    expect(messages.some((message) => message.toLowerCase().includes('título'))).toBe(true)
  })
})
