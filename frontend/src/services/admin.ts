import { apiClient } from './api';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  gamesPlayed: number;
  totalWins: number;
  totalLosses: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalGames: number;
  gamesInProgress: number;
  averageGameDuration: number;
  peakConcurrentUsers: number;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    redis: 'healthy' | 'warning' | 'error';
    websockets: 'healthy' | 'warning' | 'error';
  };
}

export interface AdminGame {
  id: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'abandoned';
  players: {
    id: string;
    username: string;
    symbol: 'X' | 'O';
  }[];
  winner?: string;
  duration?: number;
  createdAt: string;
  completedAt?: string;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxConcurrentGames: number;
  defaultGameTimeout: number;
  chatEnabled: boolean;
  socialLoginEnabled: boolean;
}

export const adminService = {
  // Get admin dashboard stats
  getStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get('/admin/stats');
    return response.data.data;
  },

  // Get all users with admin filters
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<{
    users: AdminUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.role) searchParams.append('role', params.role);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params?.search) searchParams.append('search', params.search);

    const response = await apiClient.get(`/admin/users?${searchParams.toString()}`);
    return response.data.data;
  },

  // Update user role
  updateUserRole: async (userId: string, role: 'user' | 'moderator' | 'admin'): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/role`, { role });
  },

  // Ban/unban user
  toggleUserBan: async (userId: string, banned: boolean, reason?: string): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/ban`, { banned, reason });
  },

  // Delete user account
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  // Get all games with admin filters
  getGames: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    games: AdminGame[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo);

    const response = await apiClient.get(`/admin/games?${searchParams.toString()}`);
    return response.data.data;
  },

  // Force end a game
  forceEndGame: async (gameId: string, reason?: string): Promise<void> => {
    await apiClient.put(`/admin/games/${gameId}/end`, { reason });
  },

  // Get system settings
  getSystemSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get('/admin/settings');
    return response.data.data;
  },

  // Update system settings
  updateSystemSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await apiClient.put('/admin/settings', settings);
    return response.data.data;
  },

  // Get system logs
  getSystemLogs: async (params?: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: {
      id: string;
      level: string;
      message: string;
      timestamp: string;
      metadata?: any;
    }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const searchParams = new URLSearchParams();
    if (params?.level) searchParams.append('level', params.level);
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/admin/logs?${searchParams.toString()}`);
    return response.data.data;
  },

  // Send system announcement
  sendAnnouncement: async (announcement: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    targetRole?: 'all' | 'user' | 'moderator' | 'admin';
  }): Promise<void> => {
    await apiClient.post('/admin/announcements', announcement);
  }
};
