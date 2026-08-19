export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  meta: PaginationMeta | null
  code?: string | null
}

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ApiError {
  success: false
  message: string | string[]
  data: null
  meta: null
  status?: number
  code?: string | null
}

export interface PaginationParams {
  page?: number
  perPage?: number
}
