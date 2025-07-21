import { apiClient } from './api';
import { Notification } from '../types';

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export const notificationsAPI = {
  // Get notifications with pagination
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> => {
    const { page = 1, limit = 20, unreadOnly = false } = params || {};
    const response = await apiClient.get<{ data: NotificationsResponse }>(
      `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`
    );
    return response.data?.data || {
      notifications: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      unreadCount: 0
    };
  },

  // Get unread notifications count
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<{ data: { count: number } }>('/notifications/unread-count');
    return response.data?.data?.count || 0;
  },

  // Mark specific notification as read
  markAsRead: async (notificationId: string): Promise<Notification | null> => {
    const response = await apiClient.patch<{ data: Notification }>(`/notifications/${notificationId}/read`);
    return response.data?.data || null;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/mark-all-read');
  },

  // Delete specific notification
  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  // Delete all read notifications
  deleteAllRead: async (): Promise<{ deletedCount: number }> => {
    const response = await apiClient.delete<{ data: { deletedCount: number } }>('/notifications/read/all');
    return response.data?.data || { deletedCount: 0 };
  },

  // Create test notification (for development)
  createTestNotification: async (params?: {
    type?: 'game_invite' | 'friend_request' | 'game_result' | 'system' | 'achievement';
    title?: string;
    message?: string;
  }): Promise<Notification | null> => {
    const response = await apiClient.post<{ data: Notification }>('/notifications/test', params);
    return response.data?.data || null;
  },
};

export default notificationsAPI;
