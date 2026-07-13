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

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Priority {
  id: string
  name: string
  level: PriorityLevel
  color: string
  description: string
  status: CatalogStatus
}

export interface PrioritiesListParams extends PaginationParams {
  search?: string
  status?: CatalogStatus
}

export interface CreatePriorityPayload {
  name: string
  level: PriorityLevel
  color?: string
  description?: string
}

export interface UpdatePriorityPayload {
  name: string
  level: PriorityLevel
  color?: string
  description?: string
}

export interface SlaPolicy {
  id: string
  name: string
  priorityId: string
  priorityName: string
  responseHours: number
  resolutionHours: number
  status: CatalogStatus
}

export interface SlaPoliciesListParams extends PaginationParams {
  search?: string
  status?: CatalogStatus
}

export interface CreateSlaPolicyPayload {
  name: string
  priorityId: string
  responseHours: number
  resolutionHours: number
}

export interface UpdateSlaPolicyPayload {
  name: string
  priorityId: string
  responseHours: number
  resolutionHours: number
}

export type CompanyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

export interface Company {
  id: string
  name: string
  industry: string
  region: string
  tier: CompanyTier
  contactEmail: string
  contactPhone: string
  activeTickets: number
  status: CatalogStatus
}

export interface CompaniesListParams extends PaginationParams {
  search?: string
  industry?: string
  region?: string
  tier?: CompanyTier
}
