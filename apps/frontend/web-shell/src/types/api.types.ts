export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  meta: PaginationMeta | null
}

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ApiError {
  success: false
  message: string
  data: null
  meta: null
  status?: number
}

export interface PaginationParams {
  page?: number
  perPage?: number
}
