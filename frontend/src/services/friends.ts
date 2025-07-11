import { apiClient } from './api';

export interface Friend {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  friendshipSince: string;
  gamesPlayed: number;
  winRate: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderEmail: string;
  senderAvatar?: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendFriendRequestData {
  receiverEmail?: string;
  receiverUsername?: string;
  message?: string;
}

export const friendsService = {
  // Get all friends
  getFriends: async (): Promise<Friend[]> => {
    const response = await apiClient.get('/friends');
    return response.data.data;
  },

  // Send friend request
  sendFriendRequest: async (requestData: SendFriendRequestData): Promise<FriendRequest> => {
    const response = await apiClient.post('/friends/request', requestData);
    return response.data.data;
  },

  // Get pending friend requests (sent and received)
  getFriendRequests: async (): Promise<{
    sent: FriendRequest[];
    received: FriendRequest[];
  }> => {
    const response = await apiClient.get('/friends/requests');
    return response.data.data;
  },

  // Accept friend request
  acceptFriendRequest: async (requestId: string): Promise<void> => {
    await apiClient.put(`/friends/requests/${requestId}/accept`);
  },

  // Reject friend request
  rejectFriendRequest: async (requestId: string): Promise<void> => {
    await apiClient.put(`/friends/requests/${requestId}/reject`);
  },

  // Remove friend
  removeFriend: async (friendId: string): Promise<void> => {
    await apiClient.delete(`/friends/${friendId}`);
  },

  // Get friend profile
  getFriendProfile: async (friendId: string): Promise<Friend> => {
    const response = await apiClient.get(`/friends/${friendId}/profile`);
    return response.data.data;
  },

  // Search users to add as friends
  searchUsers: async (query: string): Promise<{
    id: string;
    username: string;
    email: string;
    avatar?: string;
    isFriend: boolean;
    hasPendingRequest: boolean;
  }[]> => {
    const response = await apiClient.get(`/friends/search?query=${encodeURIComponent(query)}`);
    return response.data.data;
  },

  // Get mutual friends
  getMutualFriends: async (userId: string): Promise<Friend[]> => {
    const response = await apiClient.get(`/friends/${userId}/mutual`);
    return response.data.data;
  },

  // Get friend activity/game history
  getFriendActivity: async (friendId: string, page?: number, limit?: number): Promise<{
    activities: {
      id: string;
      type: 'game_played' | 'achievement' | 'level_up';
      description: string;
      createdAt: string;
    }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const response = await apiClient.get(`/friends/${friendId}/activity?${params.toString()}`);
    return response.data.data;
  }
};
