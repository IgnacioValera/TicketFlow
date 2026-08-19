export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT'
export type ClientSegment = 'ENTERPRISE' | 'MID_MARKET' | 'SMB'
export type ClientTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
export type OpportunityStage = 'NEW' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST'
export type ActivityType = 'CALL' | 'MEETING' | 'TASK' | 'NOTE'
export type ActivityStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'
export type SurveyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type SurveyTrigger = 'MANUAL' | 'OPPORTUNITY_WON'
export type SurveyQuestionType = 'TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'NPS' | 'RATING' | 'YES_NO'

export interface CrmClient {
  id: string
  name: string
  industry: string
  region: string
  tier: ClientTier
  segment: ClientSegment
  email: string
  phone: string
  status: ClientStatus
  score: number
  ownerId: string | null
  ownerName: string | null
  createdAt: string
}

export interface CrmContact {
  id: string
  clientId: string
  clientName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  isPrimary: boolean
}

export interface CrmOpportunity {
  id: string
  clientId: string
  clientName: string
  contactId: string | null
  contactName: string | null
  ownerId: string | null
  ownerName: string | null
  title: string
  amount: number
  currency: string
  probability: number
  stage: OpportunityStage
  expectedCloseDate: string | null
  lostReason: string | null
  notes: string
  invitations?: Array<{ surveyId: string; surveyTitle: string; url: string; token: string }>
}

export interface CrmActivity {
  id: string
  clientId: string
  clientName: string
  opportunityId: string | null
  opportunityTitle: string | null
  type: ActivityType
  status: ActivityStatus
  subject: string
  body: string
  dueAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface CrmSurveyQuestion {
  id: string
  prompt: string
  type: SurveyQuestionType
  required: boolean
  position: number
  options: Array<{ id: string; label: string; value: string }>
}

export interface CrmSurvey {
  id: string
  title: string
  description: string
  status: SurveyStatus
  trigger: SurveyTrigger
  questions?: CrmSurveyQuestion[]
}

export interface CrmDashboard {
  pipeline: Array<{ stage: OpportunityStage; count: number; amount: number }>
  conversionRate: number
  nps: { nps: number; promoters: number; passives: number; detractors: number; total: number }
  activitiesDue: number
  pendingActivities: number
  wonThisMonth: number
  wonAmountThisMonth: number
  lostThisMonth: number
  activeClients: number
  contacts: number
  openOpportunities: number
  openPipelineAmount: number
  topClients: Array<{ id: string; name: string; score: number; segment: ClientSegment }>
}

export interface Customer360 {
  client: CrmClient
  kpis: { score: number; contacts: number; openOpportunities: number; wonAmount: number; openTickets: number }
  contacts: CrmContact[]
  opportunities: Array<{ id: string; title: string; amount: number; stage: OpportunityStage; probability: number }>
  activities: Array<{ id: string; type: ActivityType; status: ActivityStatus; subject: string; createdAt: string }>
  tickets: Array<{ id: string; folio: string; title: string; status: string; createdAt: string }>
  timeline: Array<{ type: string; at: string; title: string; detail: string; id: string }>
}

export const PROBABILITY_BY_STAGE: Record<OpportunityStage, number> = {
  NEW: 10,
  QUALIFICATION: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
}
