import { apiClient } from './api';
import { 
  ChatRoom, 
  ChatMessage, 
  SendMessageRequest, 
  User 
} from '../types';

export const chatAPI = {
  // Chat room management
  getChatRooms: (params?: { type?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const queryString = searchParams.toString();
    return apiClient.get<{ 
      data: {
        rooms: ChatRoom[]; 
        pagination: any; 
        meta: any; 
      }
    }>(`/chat/rooms${queryString ? `?${queryString}` : ''}`).then(res => res.data);
  },

  createChatRoom: (data: { name: string; description?: string }) =>
    apiClient.post('/chat/rooms', data).then(res => res.data.data),

  deleteChatRoom: (roomId: string) =>
    apiClient.delete(`/chat/rooms/${roomId}`).then(res => res.data),

  joinChatRoom: (roomId: string) => 
    apiClient.post(`/chat/rooms/${roomId}/join`).then(res => res.data),

  leaveChatRoom: (roomId: string) => 
    apiClient.post(`/chat/rooms/${roomId}/leave`).then(res => res.data),

  getChatRoomUsers: (roomId: string) => 
    apiClient.get<{ data: User[] }>(`/chat/rooms/${roomId}/users`).then(res => res.data || []),

  // Message management - aligned with backend API
  getChatHistory: (gameId: string, page: number = 1, limit: number = 50) => 
    apiClient.get<{ data: { messages: ChatMessage[]; pagination: any } }>(`/chat/history/${gameId}?page=${page}&limit=${limit}`).then(res => res.data),

  sendMessage: (data: SendMessageRequest) => 
    apiClient.post<{ data: ChatMessage }>('/chat/send', data).then(res => res.data),

  // Backward compatibility
  getGameChatHistory: (gameId: string, page: number = 1, limit: number = 50) => 
    apiClient.get<{ data: { messages: ChatMessage[]; pagination: any } }>(`/chat/history/${gameId}?page=${page}&limit=${limit}`).then(res => res.data),

  sendGameMessage: (data: SendMessageRequest & { roomId?: string; gameId?: string }) => 
    apiClient.post<{ data: ChatMessage }>('/chat/send', data).then(res => res.data),
};

export default chatAPI;
