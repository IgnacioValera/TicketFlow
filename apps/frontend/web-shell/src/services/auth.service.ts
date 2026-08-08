import { apiGet, apiPost } from '@/services/apiClient'
import type { LoginCredentials, LoginResponse, User } from '@/types/user.types'
import { tokenStorage } from '@/utils/storage'

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiPost<LoginResponse>('/auth/login', credentials)
  const { accessToken, refreshToken } = response.data
  tokenStorage.setAccessToken(accessToken)
  if (refreshToken) {
    tokenStorage.setRefreshToken(refreshToken)
  }
  return response.data
}

export async function refreshToken(): Promise<string | null> {
  const storedRefresh = tokenStorage.getRefreshToken()
  if (!storedRefresh) return null

  try {
    const response = await apiPost<{ accessToken: string }>('/auth/refresh', {
      refreshToken: storedRefresh,
    })
    tokenStorage.setAccessToken(response.data.accessToken)
    return response.data.accessToken
  } catch {
    tokenStorage.clearTokens()
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await apiPost<null>('/auth/logout')
  } finally {
    tokenStorage.clearTokens()
  }
}

export async function getProfile(): Promise<User> {
  const response = await apiGet<User>('/auth/me')
  return response.data
}
