import { apiDelete, apiGet, apiPost, apiPut } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  CategoriesListParams,
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/types/catalog.types'

export async function getCategories(params: CategoriesListParams = {}) {
  const response = await apiGet<Category[]>('/categories', params as Record<string, unknown>)
  return response as ApiResponse<Category[]>
}

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  const response = await apiPost<Category>('/categories', payload)
  return response.data
}

export async function updateCategory(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<Category> {
  const response = await apiPut<Category>(`/categories/${id}`, payload)
  return response.data
}

export async function deactivateCategory(id: string): Promise<Category> {
  const response = await apiDelete<Category>(`/categories/${id}`)
  return response.data
}
