import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  CatalogStatus,
  CreatePriorityPayload,
  PrioritiesListParams,
  Priority,
  UpdatePriorityPayload,
} from '@/types/catalog.types'

export async function getPriorities(params: PrioritiesListParams = {}) {
  const response = await apiGet<Priority[]>('/priorities', params as Record<string, unknown>)
  return response as ApiResponse<Priority[]>
}

export async function createPriority(payload: CreatePriorityPayload): Promise<Priority> {
  const response = await apiPost<Priority>('/priorities', payload)
  return response.data
}

export async function updatePriority(
  id: string,
  payload: UpdatePriorityPayload,
): Promise<Priority> {
  const response = await apiPut<Priority>(`/priorities/${id}`, payload)
  return response.data
}

export async function deactivatePriority(id: string): Promise<Priority> {
  const response = await apiDelete<Priority>(`/priorities/${id}`)
  return response.data
}

export async function updatePriorityStatus(
  id: string,
  status: CatalogStatus,
): Promise<Priority> {
  const response = await apiPatch<Priority>(`/priorities/${id}/status`, { status })
  return response.data
}
