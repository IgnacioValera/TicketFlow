import { apiGet, apiPost, apiPut } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  CreateSlaPolicyPayload,
  SlaPoliciesListParams,
  SlaPolicy,
  UpdateSlaPolicyPayload,
} from '@/types/catalog.types'

export async function getSlaPolicies(params: SlaPoliciesListParams = {}) {
  const response = await apiGet<SlaPolicy[]>('/sla-policies', params as Record<string, unknown>)
  return response as ApiResponse<SlaPolicy[]>
}

export async function createSlaPolicy(payload: CreateSlaPolicyPayload): Promise<SlaPolicy> {
  const response = await apiPost<SlaPolicy>('/sla-policies', payload)
  return response.data
}

export async function updateSlaPolicy(
  id: string,
  payload: UpdateSlaPolicyPayload,
): Promise<SlaPolicy> {
  const response = await apiPut<SlaPolicy>(`/sla-policies/${id}`, payload)
  return response.data
}
