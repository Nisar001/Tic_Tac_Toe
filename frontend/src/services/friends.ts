import { apiClient } from './api';
import { 
  User, 
  FriendRequest, 
  SendFriendRequestRequest 
} from '../types';

export const friendsAPI = {
  // Friends
  getFriends: async (): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>('/friends');
    return response.data?.data || [];
  },
  removeFriend: async (friendId: string) => {
    const response = await apiClient.delete(`/friends/${friendId}`);
    return response.data;
  },

  // Friend Requests
  sendFriendRequest: async (data: SendFriendRequestRequest): Promise<FriendRequest | null> => {
    const response = await apiClient.post<{ data: FriendRequest }>('/friends/request', data);
    return response.data?.data || null;
  },
  getFriendRequests: async (): Promise<{ sent: FriendRequest[]; received: FriendRequest[] }> => {
    const response = await apiClient.get<{ data: { sent: FriendRequest[]; received: FriendRequest[] } }>('/friends/requests');
    return response.data?.data || { sent: [], received: [] };
  },
  acceptFriendRequest: async (requestId: string) => {
    const response = await apiClient.post(`/friends/requests/${requestId}/accept`);
    return response.data;
  },
  rejectFriendRequest: async (requestId: string) => {
    const response = await apiClient.post(`/friends/requests/${requestId}/reject`);
    return response.data;
  },
  cancelFriendRequest: async (requestId: string) => {
    const response = await apiClient.delete(`/friends/requests/${requestId}`);
    return response.data;
  },

  // User Search
  // searchUsers already defined above, removed duplicate

  // Blocking
  blockUser: async (userId: string) => {
    const response = await apiClient.post(`/friends/block/${userId}`);
    return response.data;
  },
  unblockUser: async (userId: string) => {
    const response = await apiClient.delete(`/friends/block/${userId}`);
    return response.data;
  },
  getBlockedUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>('/friends/blocked');
    return response.data?.data || [];
  },
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>(`/friends/search?q=${encodeURIComponent(query)}`);
    return response.data?.data || [];
  },
};

export default friendsAPI;
