import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { socketService } from '../services/socket';
import { SocketContextType } from '../types';

interface SocketState {
  socket: any | null;
  isConnected: boolean;
}

type SocketAction =
  | { type: 'SET_SOCKET'; payload: any }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'DISCONNECT' };

const initialState: SocketState = {
  socket: null,
  isConnected: false,
};

const socketReducer = (state: SocketState, action: SocketAction): SocketState => {
  switch (action.type) {
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'DISCONNECT':
      return { ...state, socket: null, isConnected: false };
    default:
      return state;
  }
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(socketReducer, initialState);

  useEffect(() => {
    return () => {
      if (state.socket) {
        socketService.disconnect();
      }
    };
  }, [state.socket]);

  const connect = () => {
    // Prevent multiple connections
    if (state.socket?.connected || state.isConnected) {
      return;
    }

    const socket = socketService.connect();
    dispatch({ type: 'SET_SOCKET', payload: socket });

    socket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
    });

    // Handle connection errors
    socket.on('connect_error', () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
    });
  };

  const disconnect = () => {
    if (state.socket) {
      socketService.disconnect();
      dispatch({ type: 'DISCONNECT' });
    }
  };

  const emit = (event: string, data?: any) => {
    if (state.socket && state.isConnected) {
      socketService.emit(event, data);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (state.socket) {
      socketService.on(event, callback);
    }
  };

  const off = (event: string, callback: (...args: any[]) => void) => {
    if (state.socket) {
      socketService.off(event, callback);
    }
  };

  const value: SocketContextType = {
    socket: state.socket,
    isConnected: state.isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};


