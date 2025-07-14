import { apiClient } from './api';
import { 
  User, 
  FriendRequest, 
  SendFriendRequestRequest 
} from '../types';

export const friendsAPI = {
  // Get all friends
  getFriends: () => 
    apiClient.get<User[]>('/friends'),

  // Send friend request
  sendFriendRequest: (data: SendFriendRequestRequest) => 
    apiClient.post<FriendRequest>('/friends/request', data),

  // Get friend requests
  getFriendRequests: () => 
    apiClient.get<{
      sent: FriendRequest[];
      received: FriendRequest[];
    }>('/friends/requests'),

  // Accept friend request
  acceptFriendRequest: (requestId: string) => 
    apiClient.post(`/friends/requests/${requestId}/accept`),

  // Reject friend request
  rejectFriendRequest: (requestId: string) => 
    apiClient.post(`/friends/requests/${requestId}/reject`),

  // Cancel sent friend request
  cancelFriendRequest: (requestId: string) => 
    apiClient.delete(`/friends/requests/${requestId}`),

  // Remove friend
  removeFriend: (friendId: string) => 
    apiClient.delete(`/friends/${friendId}`),

  // Block user
  blockUser: (userId: string) => 
    apiClient.post(`/friends/block/${userId}`),

  // Unblock user
  unblockUser: (userId: string) => 
    apiClient.delete(`/friends/block/${userId}`),

  // Get blocked users
  getBlockedUsers: () => 
    apiClient.get<User[]>('/friends/blocked'),

  // Search users
  searchUsers: (query: string) => 
    apiClient.get<User[]>(`/friends/search?q=${encodeURIComponent(query)}`),
};

export default friendsAPI;
