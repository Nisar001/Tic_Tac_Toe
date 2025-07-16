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
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
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
    return response.data;
  },

  // Get all users with admin filters
  getUsers: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    users: AdminUser[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalUsers: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> => {
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    const response = await apiClient.get(`/admin/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Update user role and status
  updateUser: async (userId: string, data: { role?: 'user' | 'moderator' | 'admin'; isActive?: boolean }): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}`, data);
  },

  // Delete user account
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  // Get all games with admin filters
  getGames: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    games: AdminGame[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalGames: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> => {
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    const response = await apiClient.get(`/admin/games?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get system settings
  getSystemSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  // Update system settings
  updateSystemSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await apiClient.put('/admin/settings', settings);
    return response.data;
  },
};
