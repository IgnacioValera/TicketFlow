import type { PaginationParams } from '@/types/api.types'

export type CatalogStatus = 'ACTIVE' | 'INACTIVE'

export interface Category {
  id: string
  name: string
  description: string
  status: CatalogStatus
}

export interface CategoriesListParams extends PaginationParams {
  search?: string
  status?: CatalogStatus
}

export interface CreateCategoryPayload {
  name: string
  description?: string
}

export interface UpdateCategoryPayload {
  name: string
  description?: string
}
