import { apiClient } from './api';
import { 
  User, 
  FriendRequest, 
  SendFriendRequestRequest 
} from '../types';

export const friendsAPI = {
  // Get all friends
  getFriends: async (): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>('/friends');
    return response.data?.data || [];
  },

  // Send friend request
  sendFriendRequest: async (data: SendFriendRequestRequest): Promise<FriendRequest | null> => {
    const response = await apiClient.post<{ data: FriendRequest }>('/friends/request', data);
    return response.data?.data || null;
  },

  // Get friend requests
  getFriendRequests: async (): Promise<{ sent: FriendRequest[]; received: FriendRequest[] }> => {
    const response = await apiClient.get<{
      data: {
        sent: FriendRequest[];
        received: FriendRequest[];
      }
    }>('/friends/requests');
    return response.data?.data || { sent: [], received: [] };
  },

  // Accept friend request
  acceptFriendRequest: async (requestId: string) => {
    const response = await apiClient.post(`/friends/requests/${requestId}/accept`);
    return response.data;
  },

  // Reject friend request
  rejectFriendRequest: async (requestId: string) => {
    const response = await apiClient.post(`/friends/requests/${requestId}/reject`);
    return response.data;
  },

  // Cancel sent friend request
  cancelFriendRequest: async (requestId: string) => {
    const response = await apiClient.delete(`/friends/requests/${requestId}`);
    return response.data;
  },

  // Remove friend
  removeFriend: async (friendId: string) => {
    const response = await apiClient.delete(`/friends/${friendId}`);
    return response.data;
  },

  // Block user
  blockUser: async (userId: string) => {
    const response = await apiClient.post(`/friends/block/${userId}`);
    return response.data;
  },

  // Unblock user
  unblockUser: async (userId: string) => {
    const response = await apiClient.delete(`/friends/block/${userId}`);
    return response.data;
  },

  // Get blocked users
  getBlockedUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>('/friends/blocked');
    return response.data?.data || [];
  },

  // Search users
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>(`/friends/search?q=${encodeURIComponent(query)}`);
    return response.data?.data || [];
  },
};

export default friendsAPI;
