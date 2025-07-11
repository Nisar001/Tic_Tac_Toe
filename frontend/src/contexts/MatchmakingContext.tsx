import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { matchmakingService, MatchmakingStatus, MatchmakingStats, MatchFound } from '../services/matchmaking';
import { useSocket } from './SocketContext';

interface MatchmakingState {
  status: MatchmakingStatus | null;
  stats: MatchmakingStats | null;
  foundMatch: MatchFound | null;
  loading: boolean;
  error: string | null;
}

type MatchmakingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATUS'; payload: MatchmakingStatus | null }
  | { type: 'SET_STATS'; payload: MatchmakingStats }
  | { type: 'SET_FOUND_MATCH'; payload: MatchFound | null }
  | { type: 'UPDATE_QUEUE_POSITION'; payload: { position: number; estimatedWaitTime: number } };

const initialState: MatchmakingState = {
  status: null,
  stats: null,
  foundMatch: null,
  loading: false,
  error: null,
};

const matchmakingReducer = (state: MatchmakingState, action: MatchmakingAction): MatchmakingState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_STATUS':
      return { ...state, status: action.payload, loading: false };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_FOUND_MATCH':
      return { ...state, foundMatch: action.payload };
    case 'UPDATE_QUEUE_POSITION':
      return {
        ...state,
        status: state.status ? {
          ...state.status,
          queuePosition: action.payload.position,
          estimatedWaitTime: action.payload.estimatedWaitTime,
        } : null,
      };
    default:
      return state;
  }
};

interface MatchmakingContextType {
  state: MatchmakingState;
  joinQueue: (preferences?: any) => Promise<void>;
  leaveQueue: () => Promise<void>;
  getStatus: () => Promise<void>;
  getStats: () => Promise<void>;
  acceptMatch: () => void;
  declineMatch: () => void;
  clearFoundMatch: () => void;
}

const MatchmakingContext = createContext<MatchmakingContextType | undefined>(undefined);

export const useMatchmakingContext = () => {
  const context = useContext(MatchmakingContext);
  if (!context) {
    throw new Error('useMatchmakingContext must be used within a MatchmakingProvider');
  }
  return context;
};

interface MatchmakingProviderProps {
  children: ReactNode;
}

export const MatchmakingProvider: React.FC<MatchmakingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(matchmakingReducer, initialState);
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      // Listen for matchmaking events
      socket.on('matchmaking:queue_update', (data: { position: number; estimatedWaitTime: number }) => {
        dispatch({ type: 'UPDATE_QUEUE_POSITION', payload: data });
      });

      socket.on('matchmaking:match_found', (data: MatchFound) => {
        dispatch({ type: 'SET_FOUND_MATCH', payload: data });
      });

      socket.on('matchmaking:match_cancelled', () => {
        dispatch({ type: 'SET_FOUND_MATCH', payload: null });
      });

      socket.on('matchmaking:left_queue', () => {
        dispatch({ type: 'SET_STATUS', payload: null });
      });

      return () => {
        socket.off('matchmaking:queue_update');
        socket.off('matchmaking:match_found');
        socket.off('matchmaking:match_cancelled');
        socket.off('matchmaking:left_queue');
      };
    }
  }, [socket]);

  const joinQueue = async (preferences?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const status = await matchmakingService.joinQueue(preferences);
      dispatch({ type: 'SET_STATUS', payload: status });
      
      if (socket) {
        socket.emit('matchmaking:join_queue', { preferences });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to join matchmaking queue' });
    }
  };

  const leaveQueue = async () => {
    try {
      await matchmakingService.leaveQueue();
      dispatch({ type: 'SET_STATUS', payload: null });
      
      if (socket) {
        socket.emit('matchmaking:leave_queue');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to leave matchmaking queue' });
    }
  };

  const getStatus = async () => {
    try {
      const status = await matchmakingService.getStatus();
      dispatch({ type: 'SET_STATUS', payload: status });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to get matchmaking status' });
    }
  };

  const getStats = async () => {
    try {
      const stats = await matchmakingService.getStats();
      dispatch({ type: 'SET_STATS', payload: stats });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to get matchmaking stats' });
    }
  };

  const acceptMatch = () => {
    if (socket && state.foundMatch) {
      socket.emit('matchmaking:accept_match', { gameId: state.foundMatch.gameId });
    }
  };

  const declineMatch = () => {
    if (socket && state.foundMatch) {
      socket.emit('matchmaking:decline_match', { gameId: state.foundMatch.gameId });
      dispatch({ type: 'SET_FOUND_MATCH', payload: null });
    }
  };

  const clearFoundMatch = () => {
    dispatch({ type: 'SET_FOUND_MATCH', payload: null });
  };

  const value: MatchmakingContextType = {
    state,
    joinQueue,
    leaveQueue,
    getStatus,
    getStats,
    acceptMatch,
    declineMatch,
    clearFoundMatch,
  };

  return <MatchmakingContext.Provider value={value}>{children}</MatchmakingContext.Provider>;
};
