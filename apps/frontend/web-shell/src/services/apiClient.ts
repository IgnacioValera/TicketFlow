import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types/api.types'
import { tokenStorage } from '@/utils/storage'

type RefreshHandler = () => Promise<string | null>
type LogoutHandler = () => void

let refreshHandler: RefreshHandler | null = null
let logoutHandler: LogoutHandler | null = null
let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

export function setAuthHandlers(onRefresh: RefreshHandler, onLogout: LogoutHandler) {
  refreshHandler = onRefresh
  logoutHandler = onLogout
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse<unknown>
    if (payload && typeof payload.success === 'boolean') {
      if (!payload.success) {
        return Promise.reject(payload)
      }
      return { ...response, data: payload }
    }
    return response
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')

      if (!isAuthEndpoint && refreshHandler) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push((token) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`
                resolve(apiClient(originalRequest))
              } else {
                reject(error)
              }
            })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const newToken = await refreshHandler()
          refreshQueue.forEach((cb) => cb(newToken))
          refreshQueue = []

          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return apiClient(originalRequest)
          }

          logoutHandler?.()
        } catch {
          refreshQueue.forEach((cb) => cb(null))
          refreshQueue = []
          logoutHandler?.()
        } finally {
          isRefreshing = false
        }
      }
    }

    const message =
      error.response?.data?.message || error.message || 'Error inesperado en la solicitud'

    return Promise.reject({
      success: false,
      message,
      data: null,
      meta: null,
      status,
    })
  },
)

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const response = await apiClient.get<ApiResponse<T>>(url, { params })
  return response.data
}

export async function apiPost<T>(url: string, body?: unknown) {
  const response = await apiClient.post<ApiResponse<T>>(url, body)
  return response.data
}

export async function apiPut<T>(url: string, body?: unknown) {
  const response = await apiClient.put<ApiResponse<T>>(url, body)
  return response.data
}

export async function apiPatch<T>(url: string, body?: unknown) {
  const response = await apiClient.patch<ApiResponse<T>>(url, body)
  return response.data
}

export default apiClient
