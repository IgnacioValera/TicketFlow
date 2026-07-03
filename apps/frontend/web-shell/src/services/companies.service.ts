import { apiGet } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api.types'
import type { CompaniesListParams, Company } from '@/types/catalog.types'

export async function getCompanies(params: CompaniesListParams = {}) {
  const response = await apiGet<Company[]>('/companies', params as Record<string, unknown>)
  return response as ApiResponse<Company[]>
}

export async function getCompanyById(id: string): Promise<Company> {
  const response = await apiGet<Company>(`/companies/${id}`)
  return response.data
}
