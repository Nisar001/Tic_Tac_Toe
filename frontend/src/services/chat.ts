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
        total: number;
        page: number;
        limit: number;
      }
    }>(`/chat/rooms${queryString ? `?${queryString}` : ''}`).then(res => res.data?.data);
  },

  createChatRoom: (data: { name: string; description?: string; type?: string }) =>
    apiClient.post('/chat/rooms', data).then(res => res.data?.data),

  deleteChatRoom: (roomId: string) =>
    apiClient.delete(`/chat/rooms/${roomId}`).then(res => res.data?.data),

  joinChatRoom: (roomId: string) => 
    apiClient.post(`/chat/rooms/${roomId}/join`).then(res => res.data?.data),

  leaveChatRoom: (roomId: string) => 
    apiClient.post(`/chat/rooms/${roomId}/leave`).then(res => res.data?.data),

  getChatRoomUsers: (roomId: string) => 
    apiClient.get<{ data: { participants: User[]; spectators: User[] } }>(`/chat/rooms/${roomId}/users`).then(res => res.data?.data),

  // Message management - aligned with backend API
  getRoomMessages: (roomId: string, limit: number = 50, offset: number = 0) =>
    apiClient.get<{ data: { roomId: string; messages: ChatMessage[]; total: number } }>(`/chat/rooms/${roomId}/messages?limit=${limit}&offset=${offset}`).then(res => res.data?.data),

  sendRoomMessage: (roomId: string, message: string, messageType?: string) =>
    apiClient.post<{ data: { message: ChatMessage } }>(`/chat/rooms/${roomId}/messages`, { message, messageType }).then(res => res.data?.data),

  // Legacy/compatibility
  getGameChatHistory: (gameId: string, page: number = 1, limit: number = 50) => 
    apiClient.get<{ data: { messages: ChatMessage[]; pagination: any } }>(`/chat/history/${gameId}?page=${page}&limit=${limit}`).then(res => res.data?.data),

  sendGameMessage: (data: SendMessageRequest & { roomId?: string; gameId?: string }) => 
    apiClient.post<{ data: ChatMessage }>('/chat/send', data).then(res => res.data?.data),
};

export default chatAPI;
