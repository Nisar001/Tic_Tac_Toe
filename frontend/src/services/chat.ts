import { apiClient } from './api';
import { 
  ChatRoom, 
  ChatMessage, 
  SendMessageRequest, 
  User 
} from '../types';

export const chatAPI = {
  // Chat room management - Updated to match backend API structure
  getChatRooms: (params?: { type?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const queryString = searchParams.toString();
    return apiClient.get<{ 
      data: {
        rooms: ChatRoom[]; 
        total: number;
        page: number;
        limit: number;
      }
    }>(`/chat/rooms${queryString ? `?${queryString}` : ''}`).then(res => res.data?.data);
  },

  createChatRoom: (data: { name: string; description?: string; type?: string }) =>
    apiClient.post<{ data: any }>('/chat/rooms', data).then(res => res.data?.data),

  deleteChatRoom: (roomId: string) =>
    apiClient.delete(`/chat/rooms/${roomId}`).then(res => res.data?.data),

  joinChatRoom: (roomId: string) => 
    apiClient.post(`/chat/join/${roomId}`).then(res => res.data?.data),

  leaveChatRoom: (roomId: string) => 
    apiClient.post(`/chat/leave/${roomId}`).then(res => res.data?.data),

  getChatRoomUsers: (roomId: string) => 
    apiClient.get<{ data: { participants: User[]; spectators: User[] } }>(`/chat/rooms/${roomId}/users`).then(res => res.data?.data),

  // Message management - Updated to match backend pagination structure
  getRoomMessages: (roomId: string, limit: number = 50, offset: number = 0) =>
    apiClient.get<{ 
      data: { 
        roomId: string; 
        messages: ChatMessage[]; 
        pagination: {
          limit: number;
          offset: number;
          total: number;
          hasMore: boolean;
        }
      } 
    }>(`/chat/history/${roomId}?limit=${limit}&offset=${offset}`).then(res => res.data?.data),

  sendRoomMessage: (roomId: string, content: string, type: string = 'text') =>
    apiClient.post<{ 
      data: { 
        message: ChatMessage;
        room: string;
        timestamp: string;
        warnings?: string[];
      } 
    }>(`/chat/message`, { roomId, content, type }).then(res => res.data?.data),

  // Legacy/compatibility - Updated for backward compatibility with enhanced error handling
  getGameChatHistory: (gameId: string, limit: number = 50, offset: number = 0) => 
    apiClient.get<{ 
      data: { 
        roomId: string;
        messages: ChatMessage[]; 
        pagination: {
          limit: number;
          offset: number;
          total: number;
          hasMore: boolean;
        }
      } 
    }>(`/chat/history/${gameId}?limit=${limit}&offset=${offset}`).then(res => res.data?.data),

  sendGameMessage: (data: SendMessageRequest & { roomId?: string; gameId?: string }) => 
    apiClient.post<{ 
      data: { 
        message: ChatMessage;
        room: string;
        timestamp: string;
        warnings?: string[];
      } 
    }>('/chat/send', data).then(res => res.data?.data),
};

export default chatAPI;


