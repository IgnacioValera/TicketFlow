export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'REQUESTER'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  permissions: string[]
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
  password?: string
}

export interface UsersListParams {
  page?: number
  perPage?: number
  role?: UserRole
  status?: UserStatus
  search?: string
}

export type TicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_USER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'
