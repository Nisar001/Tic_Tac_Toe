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
      rooms: ChatRoom[]; 
      pagination: any; 
      meta: any; 
    }>(`/chat/rooms${queryString ? `?${queryString}` : ''}`);
  },

  createChatRoom: (data: { name: string; description?: string }) =>
    apiClient.post<ChatRoom>('/chat/rooms', data),

  deleteChatRoom: (roomId: string) =>
    apiClient.delete(`/chat/rooms/${roomId}`),

  joinChatRoom: (roomId: string) => 
    apiClient.post(`/chat/rooms/${roomId}/join`),

  leaveChatRoom: (roomId: string) => 
    apiClient.post(`/chat/rooms/${roomId}/leave`),

  getChatRoomUsers: (roomId: string) => 
    apiClient.get<User[]>(`/chat/rooms/${roomId}/users`),

  // Message management
  getChatHistory: (roomId: string, page: number = 1, limit: number = 50) => 
    apiClient.get<{ messages: ChatMessage[]; pagination: any }>(`/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`),

  sendMessage: (roomId: string, data: SendMessageRequest) => 
    apiClient.post<ChatMessage>(`/chat/rooms/${roomId}/messages`, data),

  // Backward compatibility
  getGameChatHistory: (gameId: string, page: number = 1, limit: number = 50) => 
    apiClient.get<{ messages: ChatMessage[]; pagination: any }>(`/chat/history/${gameId}?page=${page}&limit=${limit}`),

  sendGameMessage: (data: SendMessageRequest & { roomId?: string; gameId?: string }) => 
    apiClient.post<ChatMessage>('/chat/send', data),
};

export default chatAPI;
