import { apiClient } from './api';

export interface ChatRoom {
  id: string;
  name: string;
  type: 'game' | 'direct' | 'group';
  participants: string[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  roomId: string;
  messageType: 'text' | 'system' | 'game_event';
  createdAt: string;
}

export interface SendMessageRequest {
  roomId: string;
  content: string;
  messageType?: 'text' | 'system' | 'game_event';
}

export const chatService = {
  // Get all chat rooms for the current user
  getChatRooms: async (): Promise<ChatRoom[]> => {
    const response = await apiClient.get('/chat/rooms');
    return response.data.data;
  },

  // Join a chat room
  joinChatRoom: async (roomId: string): Promise<void> => {
    await apiClient.post(`/chat/rooms/${roomId}/join`);
  },

  // Leave a chat room
  leaveChatRoom: async (roomId: string): Promise<void> => {
    await apiClient.post(`/chat/rooms/${roomId}/leave`);
  },

  // Get chat history for a room
  getChatHistory: async (roomId: string, page?: number, limit?: number): Promise<{
    messages: ChatMessage[];
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
    
    const response = await apiClient.get(`/chat/rooms/${roomId}/history?${params.toString()}`);
    return response.data.data;
  },

  // Send a message to a chat room
  sendMessage: async (messageData: SendMessageRequest): Promise<ChatMessage> => {
    const response = await apiClient.post('/chat/send', messageData);
    return response.data.data;
  },

  // Get users in a chat room
  getChatRoomUsers: async (roomId: string): Promise<{
    id: string;
    username: string;
    isOnline: boolean;
  }[]> => {
    const response = await apiClient.get(`/chat/rooms/${roomId}/users`);
    return response.data.data;
  }
};
