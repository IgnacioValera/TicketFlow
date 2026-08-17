import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  Client,
  CrmActivity,
  CrmContact,
  CrmOpportunity,
  CrmOpportunityStageHistory,
  CrmSurvey,
  CrmSurveyAnswer,
  CrmSurveyInvitation,
  CrmSurveyQuestion,
  CrmSurveyQuestionOption,
  CrmSurveyResponse,
  SatisfactionSurvey,
  Ticket,
  User,
} from '../database/entities'
import { ActivitiesService } from './activities.service'
import { ClientsService } from './clients.service'
import { ContactsService } from './contacts.service'
import {
  ActivitiesController,
  ClientsController,
  ContactsController,
  CrmDashboardController,
  OpportunitiesController,
  PublicSurveysController,
  SurveysController,
} from './crm.controller'
import { CrmDashboardService } from './dashboard.service'
import { OpportunitiesService } from './opportunities.service'
import { SurveysService } from './surveys.service'

@Module({
  imports: [TypeOrmModule.forFeature([
    Client, User, Ticket, CrmContact, CrmOpportunity, CrmOpportunityStageHistory, CrmActivity,
    CrmSurvey, CrmSurveyQuestion, CrmSurveyQuestionOption, CrmSurveyInvitation, CrmSurveyResponse, CrmSurveyAnswer, SatisfactionSurvey,
  ])],
  controllers: [ClientsController, ContactsController, OpportunitiesController, ActivitiesController, SurveysController, PublicSurveysController, CrmDashboardController],
  providers: [ClientsService, ContactsService, OpportunitiesService, ActivitiesService, SurveysService, CrmDashboardService],
  exports: [ClientsService],
})
export class CrmModule {}
