import { apiGet, apiPatch, apiPost, apiPut } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UsersListParams,
  UserStatus,
} from '@/types/user.types'

export async function getUsers(params: UsersListParams = {}) {
  const response = await apiGet<User[]>('/users', params as Record<string, unknown>)
  return response as ApiResponse<User[]>
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const response = await apiPost<User>('/users', payload)
  return response.data
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const response = await apiPut<User>(`/users/${id}`, payload)
  return response.data
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<User> {
  const response = await apiPatch<User>(`/users/${id}/status`, { status })
  return response.data
}

export async function getUserById(id: string): Promise<User> {
  const response = await apiGet<User>(`/users/${id}`)
  return response.data
}
