import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/services/apiClient'
import apiClient from '@/services/apiClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  CrmActivity,
  CrmClient,
  CrmContact,
  CrmDashboard,
  CrmOpportunity,
  CrmSurvey,
  Customer360,
  OpportunityStage,
  SurveyResults,
} from '@/types/crm.types'
import type { CreatedSurveyInvitation } from '@/utils/opportunity-survey'
import { downloadBlob } from '@/utils/csv'

export async function getClients(params: Record<string, unknown> = {}) {
  return apiGet<CrmClient[]>('/crm/clients', params) as Promise<ApiResponse<CrmClient[]>>
}
export async function getClient(id: string) {
  const response = await apiGet<CrmClient>(`/crm/clients/${id}`)
  return response.data
}
export async function getClient360(id: string) {
  const response = await apiGet<Customer360>(`/crm/clients/${id}/360`)
  return response.data
}
export async function createClient(payload: Partial<CrmClient> & { name: string; industry: string; region: string; tier: string; segment: string; email: string; phone: string }) {
  const response = await apiPost<CrmClient>('/crm/clients', payload)
  return response.data
}
export async function updateClient(id: string, payload: Partial<CrmClient>) {
  const response = await apiPut<CrmClient>(`/crm/clients/${id}`, payload)
  return response.data
}
export async function recalculateScore(id: string) {
  const response = await apiPost<{ score: number }>(`/crm/clients/${id}/recalculate-score`)
  return response.data
}
export async function exportClientsCsv(params: Record<string, unknown> = {}) {
  const response = await apiClient.get('/crm/clients/export', { params, responseType: 'blob' })
  downloadBlob('clientes.csv', response.data as Blob)
}

export async function getContacts(params: Record<string, unknown> = {}) {
  return apiGet<CrmContact[]>('/crm/contacts', params) as Promise<ApiResponse<CrmContact[]>>
}
export async function createContact(payload: Record<string, unknown>) {
  const response = await apiPost<CrmContact>('/crm/contacts', payload)
  return response.data
}
export async function updateContact(id: string, payload: Record<string, unknown>) {
  const response = await apiPut<CrmContact>(`/crm/contacts/${id}`, payload)
  return response.data
}
export async function deleteContact(id: string) {
  const response = await apiDelete<{ id: string }>(`/crm/contacts/${id}`)
  return response.data
}

export async function getOpportunities(params: Record<string, unknown> = {}) {
  return apiGet<CrmOpportunity[]>('/crm/opportunities', params) as Promise<ApiResponse<CrmOpportunity[]>>
}
export async function getOpportunity(id: string) {
  const response = await apiGet<CrmOpportunity>(`/crm/opportunities/${id}`)
  return response.data
}
export async function createOpportunity(payload: Record<string, unknown>) {
  const response = await apiPost<CrmOpportunity>('/crm/opportunities', payload)
  return response.data
}
export async function updateOpportunity(id: string, payload: Record<string, unknown>) {
  const response = await apiPut<CrmOpportunity>(`/crm/opportunities/${id}`, payload)
  return response.data
}
export async function changeStage(id: string, payload: { stage: OpportunityStage; lostReason?: string; reopen?: boolean; reopenReason?: string }) {
  const response = await apiPatch<CrmOpportunity & { surveyInvitation?: CreatedSurveyInvitation | null }>(
    `/crm/opportunities/${id}/stage`,
    payload,
  )
  return response.data
}
export async function createSurveyInvitation(
  opportunityId: string,
  payload: { surveyId?: string; confirmRegenerate?: boolean } = {},
) {
  const response = await apiPost<CreatedSurveyInvitation>(
    `/crm/opportunities/${opportunityId}/survey-invitation`,
    payload,
  )
  return response.data
}
export async function copySurveyLink(opportunityId: string, surveyId: string) {
  const response = await apiPost<CreatedSurveyInvitation>(`/crm/opportunities/${opportunityId}/survey-links/${surveyId}`)
  return response.data
}

export async function getActivities(params: Record<string, unknown> = {}) {
  return apiGet<CrmActivity[]>('/crm/activities', params) as Promise<ApiResponse<CrmActivity[]>>
}
export async function createActivity(payload: Record<string, unknown>) {
  const response = await apiPost<CrmActivity>('/crm/activities', payload)
  return response.data
}
export async function completeActivity(id: string) {
  const response = await apiPatch<CrmActivity>(`/crm/activities/${id}/complete`)
  return response.data
}

export async function getSurveys(params: Record<string, unknown> = {}) {
  return apiGet<CrmSurvey[]>('/crm/surveys', params) as Promise<ApiResponse<CrmSurvey[]>>
}
export async function getSurvey(id: string) {
  const response = await apiGet<CrmSurvey>(`/crm/surveys/${id}`)
  return response.data
}
export async function createSurvey(payload: Record<string, unknown>) {
  const response = await apiPost<CrmSurvey>('/crm/surveys', payload)
  return response.data
}
export async function updateSurvey(id: string, payload: Record<string, unknown>) {
  const response = await apiPut<CrmSurvey>(`/crm/surveys/${id}`, payload)
  return response.data
}
export async function addQuestion(id: string, payload: Record<string, unknown>) {
  const response = await apiPost<CrmSurvey>(`/crm/surveys/${id}/questions`, payload)
  return response.data
}
export async function removeQuestion(id: string, questionId: string) {
  const response = await apiDelete<CrmSurvey>(`/crm/surveys/${id}/questions/${questionId}`)
  return response.data
}
export async function reorderQuestions(id: string, questionIds: string[]) {
  const response = await apiPut<CrmSurvey>(`/crm/surveys/${id}/questions/order`, { questionIds })
  return response.data
}
export async function publishSurvey(id: string) {
  const response = await apiPost<CrmSurvey>(`/crm/surveys/${id}/publish`)
  return response.data
}
export async function closeSurvey(id: string) {
  const response = await apiPost<CrmSurvey>(`/crm/surveys/${id}/close`)
  return response.data
}
export async function getSurveyResults(id: string) {
  const response = await apiGet<SurveyResults>(`/crm/surveys/${id}/results`)
  return response.data
}
export async function getPublicSurvey(token: string) {
  const response = await apiGet<{ title: string; description: string; questions: CrmSurvey['questions'] }>(`/public/surveys/${token}`)
  return response.data
}
export async function respondPublicSurvey(token: string, answers: unknown[]) {
  const response = await apiPost(`/public/surveys/${token}/respond`, { answers })
  return response.data
}
export async function getCrmDashboard() {
  const response = await apiGet<CrmDashboard>('/crm/dashboard')
  return response.data
}

export async function getKnowledge(search?: string) {
  const response = await apiGet<import('@/types/knowledge.types').KnowledgeArticle[]>(
    '/knowledge-articles',
    { search },
  )
  return response.data
}

export async function getKnowledgeById(id: string) {
  const response = await apiGet<import('@/types/knowledge.types').KnowledgeArticle>(
    `/knowledge-articles/${id}`,
  )
  return response.data
}

export async function createKnowledge(payload: { title: string; content: string; tags?: string; categoryId?: string }) {
  const response = await apiPost<import('@/types/knowledge.types').KnowledgeArticle>('/knowledge-articles', payload)
  return response.data
}
export async function updateKnowledge(
  id: string,
  payload: {
    title?: string
    content?: string
    tags?: string
    categoryId?: string | null
  },
) {
  const response = await apiPut<import('@/types/knowledge.types').KnowledgeArticle>(`/knowledge-articles/${id}`, payload)
  return response.data
}
export async function deleteKnowledge(id: string) {
  const response = await apiDelete(`/knowledge-articles/${id}`)
  return response.data
}
