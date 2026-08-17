export type UserRole = 'ADMIN' | 'SALES' | 'SUPERVISOR' | 'AGENT' | 'CLIENT' | 'REQUESTER'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  permissions: string[]
  mustChangePassword?: boolean
  lastLoginAt?: string | null
  createdAt?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken?: string
  user: User
}

export interface CreateUserPayload {
  fullName: string
  email: string
  password: string
  role: UserRole
}

export interface UpdateUserPayload {
  fullName?: string
  email?: string
  role?: UserRole
}

export interface UsersListParams {
  page?: number
  perPage?: number
  role?: UserRole
  status?: UserStatus
  search?: string
}

export type { TicketStatus } from '@/types/ticket.types'
