import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { chatAPI } from '../services/chat';
import { ChatRoom, ChatMessage } from '../types';
import { useSocket } from './SocketContext';

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

interface ChatContextType {
  state: ChatState;
  loadRooms: () => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  loadMessages: (roomId: string, page?: number) => Promise<void>;
  setActiveRoom: (roomId: string | null) => void;
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

  useEffect(() => {
    if (socket) {
      // Listen for new messages
      socket.on('message:new', (data: { roomId: string; message: ChatMessage }) => {
        dispatch({ type: 'ADD_MESSAGE', payload: data });
      });

      // Listen for user join/leave events
      socket.on('room:user_joined', (data: { roomId: string; userId: string }) => {
        dispatch({ type: 'USER_JOINED', payload: data });
      });

      socket.on('room:user_left', (data: { roomId: string; userId: string }) => {
        dispatch({ type: 'USER_LEFT', payload: data });
      });

      return () => {
        socket.off('message:new');
        socket.off('room:user_joined');
        socket.off('room:user_left');
      };
    }
  }, [socket]);

  const loadRooms = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await chatAPI.getChatRooms();
      // Handle new API response format
      const rooms = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.rooms || []);
      dispatch({ type: 'SET_ROOMS', payload: rooms });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load chat rooms' });
    }
  };

  const joinRoom = async (roomId: string) => {
    try {
      await chatAPI.joinChatRoom(roomId);
      if (socket) {
        socket.emit('room:join', { roomId });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to join room' });
    }
  };

  const leaveRoom = async (roomId: string) => {
    try {
      await chatAPI.leaveChatRoom(roomId);
      if (socket) {
        socket.emit('room:leave', { roomId });
      }
      dispatch({ type: 'LEAVE_ROOM', payload: roomId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to leave room' });
    }
  };

  const sendMessage = async (roomId: string, content: string) => {
    try {
      await chatAPI.sendMessage(roomId, {
        message: content,
        type: 'text',
      });
      
      if (socket) {
        socket.emit('message:send', { roomId, content });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    }
  };

  const loadMessages = async (roomId: string, page = 1) => {
    try {
      const response = await chatAPI.getChatHistory(roomId, page, 50);
      // Handle new API response format
      const messages = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.messages || []);
      dispatch({ type: 'SET_MESSAGES', payload: { roomId, messages } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages' });
    }
  };

  const setActiveRoom = (roomId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: roomId });
  };

  const value: ChatContextType = {
    state,
    loadRooms,
    joinRoom,
    leaveRoom,
    sendMessage,
    loadMessages,
    setActiveRoom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
