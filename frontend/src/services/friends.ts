import { apiClient } from './api';
import { 
  User, 
  FriendRequest, 
  SendFriendRequestRequest 
} from '../types';

export const friendsAPI = {
  // Friends - Updated to match backend routes
  getFriends: async (): Promise<User[]> => {
    try {
      const response = await apiClient.get<{ data: { friends: User[]; count: number } }>('/friends/list');
      return response.data?.data?.friends || [];
    } catch (error: any) {
      console.error('❌ API: getFriends error:', error);
      throw error;
    }
  },
  
  removeFriend: async (friendId: string) => {
    const response = await apiClient.delete(`/friends/remove/${friendId}`);
    return response.data;
  },

  getMutualFriends: async (targetUserId: string): Promise<User[]> => {
    const response = await apiClient.get<{ data: { mutualFriends: User[]; count: number } }>(`/friends/mutual/${targetUserId}`);
    return response.data?.data?.mutualFriends || [];
  },

  // Friend Requests
  sendFriendRequest: async (data: SendFriendRequestRequest): Promise<FriendRequest | null> => {
    const response = await apiClient.post<{ data: FriendRequest }>('/friends/request', data);
    return response.data?.data || null;
  },
  getFriendRequests: async (): Promise<{ sent: FriendRequest[]; received: FriendRequest[] }> => {
    try {
      const response = await apiClient.get<{ data: { sent: FriendRequest[]; received: FriendRequest[] } }>('/friends/requests');
      return response.data?.data || { sent: [], received: [] };
    } catch (error) {
      console.error('❌ API: getFriendRequests error:', error);
      throw error;
    }
  },
  acceptFriendRequest: async (requestId: string) => {
    const response = await apiClient.post(`/friends/respond`, { requestId, action: 'accept' });
    return response.data?.data;
  },
  rejectFriendRequest: async (requestId: string) => {
    const response = await apiClient.post(`/friends/respond`, { requestId, action: 'decline' });
    return response.data?.data;
  },
  cancelFriendRequest: async (requestId: string) => {
    const response = await apiClient.delete(`/friends/requests/${requestId}`);
    return response.data?.data;
  },

  // Blocking
  blockUser: async (userId: string) => {
    const response = await apiClient.post(`/friends/block/${userId}`);
    return response.data?.data;
  },
  unblockUser: async (userId: string) => {
    const response = await apiClient.delete(`/friends/block/${userId}`);
    return response.data?.data;
  },
  getBlockedUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>('/friends/blocked');
    return response.data?.data || [];
  },
  searchUsers: async (query: string): Promise<User[]> => {
    try {
      const response = await apiClient.get<{ data: User[] }>(`/friends/search?q=${encodeURIComponent(query)}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('❌ API: searchUsers error:', error);
      throw error;
    }
  },
  
  getAvailableUsers: async (limit = 50, page = 1): Promise<User[]> => {
    try {
      const response = await apiClient.get<{ data: User[] }>(`/friends/available?limit=${limit}&page=${page}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('❌ API: getAvailableUsers error:', error);
      throw error;
    }
  },

  // Debug endpoint
  debugFriends: async (): Promise<any> => {
    try {
      const response = await apiClient.get<{ data: any }>('/friends/debug');
      return response.data?.data || {};
    } catch (error) {
      console.error('❌ API: debugFriends error:', error);
      throw error;
    }
  },

  createTestUsers: async (): Promise<any> => {
    try {
      const response = await apiClient.post<{ data: any }>('/friends/create-test-users');
      return response.data || {};
    } catch (error) {
      console.error('❌ API: createTestUsers error:', error);
      throw error;
    }
  },
};

export default friendsAPI;


