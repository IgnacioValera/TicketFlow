import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ApiExceptionFilter } from '../common/api'
import { ROLE_PERMISSION_CODES } from '../common/permissions'
import { RoleCode, UserStatus } from '../database/entities'
import { MustChangePasswordGuard, PermissionsGuard } from '../auth/auth.guard'
import { OpportunitiesController, PublicSurveysController, SurveysController } from './crm.controller'
import { OpportunitiesService } from './opportunities.service'
import { SurveysService } from './surveys.service'

describe('HTTP automatización de encuestas CRM', () => {
  let app: INestApplication
  let currentUser: ReturnType<typeof actor>
  const opportunityId = '11111111-1111-4111-8111-111111111111'
  const surveyId = '22222222-2222-4222-8222-222222222222'

  const opportunitiesService = {
    list: jest.fn(),
    exportCsv: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    changeStage: jest.fn().mockResolvedValue({
      id: opportunityId,
      surveyInvitation: { created: true, surveyId, surveyTitle: 'Satisfacción postventa', responseUrl: 'https://ticketflow.example/public/surveys/abc', expiresAt: '2026-08-26T18:00:00.000Z' },
    }),
    createSurveyInvitation: jest.fn().mockResolvedValue({
      created: true,
      surveyId,
      surveyTitle: 'Satisfacción postventa',
      responseUrl: 'https://ticketflow.example/public/surveys/abc',
      expiresAt: '2026-08-26T18:00:00.000Z',
    }),
    copyInvitationLink: jest.fn(),
    update: jest.fn(),
  }

  const surveysService = {
    list: jest.fn(),
    create: jest.fn(),
    results: jest.fn().mockResolvedValue({ survey: { id: surveyId }, responses: [] }),
    getById: jest.fn(),
    publish: jest.fn(),
    close: jest.fn(),
    addQuestion: jest.fn(),
    reorderQuestions: jest.fn(),
    removeQuestion: jest.fn(),
    update: jest.fn(),
    publicForm: jest.fn().mockResolvedValue({ title: 'Satisfacción postventa', questions: [] }),
    respond: jest.fn().mockResolvedValue({ submitted: true }),
  }

  beforeAll(async () => {
    class TestJwtGuard implements CanActivate {
      canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest().user = currentUser
        return true
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [OpportunitiesController, SurveysController, PublicSurveysController],
      providers: [
        { provide: OpportunitiesService, useValue: opportunitiesService },
        { provide: SurveysService, useValue: surveysService },
        { provide: APP_GUARD, useClass: TestJwtGuard },
        { provide: APP_GUARD, useClass: MustChangePasswordGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.useGlobalFilters(new ApiExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ADMIN puede generar invitación y consultar resultados', async () => {
    currentUser = actor(RoleCode.ADMIN)
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/crm/opportunities/${opportunityId}/survey-invitation`)
      .send({})
    expect(invitation.status).toBeGreaterThanOrEqual(200)
    expect(invitation.status).toBeLessThan(300)
    expect(invitation.body.data.responseUrl).toContain('/public/surveys/')
    expect(invitation.body.data.responseUrl).not.toMatch(/demo-active-token/)
    expect(opportunitiesService.createSurveyInvitation).toHaveBeenCalled()

    const results = await request(app.getHttpServer()).get(`/api/v1/crm/surveys/${surveyId}/results`)
    expect(results.status).toBe(200)
    expect(surveysService.results).toHaveBeenCalledWith(surveyId, expect.objectContaining({ id: currentUser.id }))
  })

  it('SUPERVISOR recibe 403 al generar una invitación', async () => {
    currentUser = actor(RoleCode.SUPERVISOR)
    const response = await request(app.getHttpServer())
      .post(`/api/v1/crm/opportunities/${opportunityId}/survey-invitation`)
      .send({})
    expect(response.status).toBe(403)
    expect(opportunitiesService.createSurveyInvitation).not.toHaveBeenCalled()
  })

  it('UUID inválido produce 400 y no llama al servicio', async () => {
    currentUser = actor(RoleCode.ADMIN)
    const response = await request(app.getHttpServer()).post('/api/v1/crm/opportunities/no-uuid/survey-invitation').send({})
    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/UUID/i)
    expect(opportunitiesService.createSurveyInvitation).not.toHaveBeenCalled()
  })

  it('el público consulta y responde sin permiso interno', async () => {
    currentUser = actor(RoleCode.CLIENT)
    const form = await request(app.getHttpServer()).get('/api/v1/public/surveys/token-seguro')
    expect(form.status).toBe(200)
    const respond = await request(app.getHttpServer())
      .post('/api/v1/public/surveys/token-seguro/respond')
      .send({ answers: [] })
    expect([200, 201]).toContain(respond.status)
    expect(surveysService.respond).toHaveBeenCalled()
  })
})

function actor(role: RoleCode) {
  return {
    id: `${role.toLowerCase()}-id`,
    fullName: role,
    email: `${role.toLowerCase()}@helpdesk.com`,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    role: {
      code: role,
      permissions: ROLE_PERMISSION_CODES[role].map((code) => ({ code })),
    },
  }
}
