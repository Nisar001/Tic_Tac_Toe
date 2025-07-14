import { apiClient } from './api';
import { 
  ChatRoom, 
  ChatMessage, 
  SendMessageRequest, 
  User 
} from '../types';

export const chatAPI = {
  // Chat room management
  getChatRooms: () => 
    apiClient.get<ChatRoom[]>('/chat/rooms'),

  joinChatRoom: (roomId: string) => 
    apiClient.post(`/chat/rooms/${roomId}/join`),

  leaveChatRoom: (roomId: string) => 
    apiClient.post(`/chat/rooms/${roomId}/leave`),

  getChatRoomUsers: (roomId: string) => 
    apiClient.get<User[]>(`/chat/rooms/${roomId}/users`),

  // Message management
  getChatHistory: (roomId: string, page: number = 1, limit: number = 50) => 
    apiClient.get<ChatMessage[]>(`/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`),

  sendMessage: (roomId: string, data: SendMessageRequest) => 
    apiClient.post<ChatMessage>(`/chat/rooms/${roomId}/messages`, data),

  // Backward compatibility
  getGameChatHistory: (gameId: string, page: number = 1, limit: number = 50) => 
    apiClient.get<ChatMessage[]>(`/chat/history/${gameId}?page=${page}&limit=${limit}`),

  sendGameMessage: (gameId: string, data: SendMessageRequest) => 
    apiClient.post<ChatMessage>(`/chat/send`, { ...data, gameId }),
};

export default chatAPI;
