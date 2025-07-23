import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { chatAPI } from '../services/chat';
import { ChatRoom, ChatMessage } from '../types';
import { useSocket } from './SocketContext';
import { useAPIManager } from './APIManagerContext';
import { SOCKET_EVENTS } from '../constants';

interface ChatState {
  rooms: ChatRoom[];
  activeRoom: string | null;
  messages: { [roomId: string]: ChatMessage[] };
  loading: boolean;
  error: string | null;
  onlineUsers: { [roomId: string]: string[] };
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ROOMS'; payload: ChatRoom[] }
  | { type: 'SET_ACTIVE_ROOM'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: { roomId: string; messages: ChatMessage[] } }
  | { type: 'ADD_MESSAGE'; payload: { roomId: string; message: ChatMessage } }
  | { type: 'JOIN_ROOM'; payload: ChatRoom }
  | { type: 'LEAVE_ROOM'; payload: string }
  | { type: 'SET_ONLINE_USERS'; payload: { roomId: string; users: string[] } }
  | { type: 'USER_JOINED'; payload: { roomId: string; userId: string } }
  | { type: 'USER_LEFT'; payload: { roomId: string; userId: string } };

const initialState: ChatState = {
  rooms: [],
  activeRoom: null,
  messages: {},
  loading: false,
  error: null,
  onlineUsers: {},
};

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_ROOMS':
      return { ...state, rooms: action.payload, loading: false };
    case 'SET_ACTIVE_ROOM':
      return { ...state, activeRoom: action.payload };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: action.payload.messages,
        },
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: [
            ...(state.messages[action.payload.roomId] || []),
            action.payload.message,
          ],
        },
      };
    case 'JOIN_ROOM':
      return {
        ...state,
        rooms: [...state.rooms.filter(r => r.id !== action.payload.id), action.payload],
      };
    case 'LEAVE_ROOM':
      return {
        ...state,
        rooms: state.rooms.filter(r => r.id !== action.payload),
        activeRoom: state.activeRoom === action.payload ? null : state.activeRoom,
      };
    case 'SET_ONLINE_USERS':
      return {
        ...state,
        onlineUsers: {
          ...state.onlineUsers,
          [action.payload.roomId]: action.payload.users,
        },
      };
    case 'USER_JOINED':
      return {
        ...state,
        onlineUsers: {
          ...state.onlineUsers,
          [action.payload.roomId]: [
            ...(state.onlineUsers[action.payload.roomId] || []),
            action.payload.userId,
          ],
        },
      };
    case 'USER_LEFT':
      return {
        ...state,
        onlineUsers: {
          ...state.onlineUsers,
          [action.payload.roomId]: (state.onlineUsers[action.payload.roomId] || []).filter(
            id => id !== action.payload.userId
          ),
        },
      };
    default:
      return state;
  }
};

export interface ChatContextType {
  state: ChatState;
  loadRooms: () => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string, messageType?: string) => Promise<void>;
  loadMessages: (roomId: string, limit?: number, offset?: number) => Promise<void>;
  setActiveRoom: (roomId: string | null) => void;
  createRoom: (name: string) => Promise<void>;
  deleteChatRoom: (roomId: string) => Promise<void>;
  getChatRoomUsers: (roomId: string) => Promise<any[]>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { socket } = useSocket();
  const { executeAPI } = useAPIManager();

  useEffect(() => {
    if (socket) {
      // Listen for new messages - updated to match API documentation
      socket.on(SOCKET_EVENTS.NEW_MESSAGE, (message: ChatMessage) => {
        dispatch({ type: 'ADD_MESSAGE', payload: { roomId: message.roomId, message } });
      });

      // Listen for user join/leave events - updated to match API documentation
      socket.on(SOCKET_EVENTS.USER_JOINED_ROOM, (data: { roomId: string; user: any }) => {
        dispatch({ type: 'USER_JOINED', payload: { roomId: data.roomId, userId: data.user.id } });
      });

      socket.on(SOCKET_EVENTS.USER_LEFT_ROOM, (data: { roomId: string; user: any }) => {
        dispatch({ type: 'USER_LEFT', payload: { roomId: data.roomId, userId: data.user.id } });
      });

      return () => {
        socket.off(SOCKET_EVENTS.NEW_MESSAGE);
        socket.off(SOCKET_EVENTS.USER_JOINED_ROOM);
        socket.off(SOCKET_EVENTS.USER_LEFT_ROOM);
      };
    }
  }, [socket]);

  const loadRooms = async () => {
    const response = await executeAPI(
      'loadChatRooms',
      () => chatAPI.getChatRooms(),
      {
        maxRetries: 3,
        showToast: true,
        preventDuplicates: true
      }
    );
    if (response?.rooms) {
      dispatch({ type: 'SET_ROOMS', payload: response.rooms });
    }
  };

  const joinRoom = async (roomId: string, retry = false) => {
    try {
      await chatAPI.joinChatRoom(roomId);
      if (socket) {
        socket.emit('room:join', { roomId });
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to join room';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      if (!retry) throw new Error(message);
    }
  };

  const leaveRoom = async (roomId: string, retry = false) => {
    try {
      await chatAPI.leaveChatRoom(roomId);
      if (socket) {
        socket.emit('room:leave', { roomId });
      }
      dispatch({ type: 'LEAVE_ROOM', payload: roomId });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to leave room';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      if (!retry) throw new Error(message);
    }
  };

  const sendMessage = async (roomId: string, content: string, messageType: string = 'text', retry = false) => {
    try {
      await chatAPI.sendRoomMessage(roomId, content, messageType);
      if (socket) {
        socket.emit('message:send', { roomId, content, messageType });
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to send message';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      if (!retry) throw new Error(message);
    }
  };

  const loadMessages = async (roomId: string, limit = 50, offset = 0, retry = false) => {
    try {
      const response = await chatAPI.getRoomMessages(roomId, limit, offset);
      const messages = response?.messages || [];
      dispatch({ type: 'SET_MESSAGES', payload: { roomId, messages } });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load messages';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      if (!retry) throw new Error(message);
    }
  };

  const setActiveRoom = (roomId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: roomId });
  };

  const createRoom = async (name: string, type: string = 'private', description?: string) => {
    try {
      await chatAPI.createChatRoom({ name, type, description });
      await loadRooms();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create chat room';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      throw new Error(message);
    }
  };

  const deleteChatRoom = async (roomId: string, retry = false) => {
    try {
      await chatAPI.deleteChatRoom(roomId);
      await loadRooms();
      dispatch({ type: 'SET_ACTIVE_ROOM', payload: null });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete chat room';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      if (!retry) throw new Error(message);
    }
  };

  const getChatRoomUsers = async (roomId: string, retry = false) => {
    try {
      const users = await chatAPI.getChatRoomUsers(roomId);
      return users?.participants || [];
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch users';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      if (!retry) throw new Error(message);
      return [];
    }
  };

  const value: ChatContextType = {
    state,
    loadRooms,
    joinRoom,
    leaveRoom,
    sendMessage,
    loadMessages,
    setActiveRoom,
    createRoom,
    deleteChatRoom,
    getChatRoomUsers,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};


