import { apiGet, apiPatch } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api.types'
import type { NotificationItem } from '@/utils/notifications'

export async function getNotifications(params: { page?: number; perPage?: number; unread?: boolean } = {}) {
  return apiGet<NotificationItem[]>('/notifications', params as Record<string, unknown>) as Promise<
    ApiResponse<NotificationItem[]>
  >
}

export async function getUnreadCount() {
  const response = await apiGet<{ count: number }>('/notifications/unread-count')
  return response.data.count
}

export async function markNotificationRead(id: string) {
  const response = await apiPatch<NotificationItem>(`/notifications/${id}/read`)
  return response.data
}

export async function markAllNotificationsRead() {
  await apiPatch('/notifications/read-all')
}
