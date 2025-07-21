import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import gameAPI from '../services/game';
import { useSocket } from './SocketContext';
import { SOCKET_EVENTS } from '../constants';
import {
  GameContextType,
  Game,
  CreateGameRequest,
  GameMoveRequest,
  UserStats,
  LeaderboardEntry,
} from '../types';
import toast from 'react-hot-toast';

interface GameState {
  currentGame: Game | null;
  games: Game[];
  isLoading: boolean;
}

type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_GAME'; payload: Game | null }
  | { type: 'SET_GAMES'; payload: Game[] }
  | { type: 'ADD_GAME'; payload: Game }
  | { type: 'UPDATE_GAME'; payload: Game }
  | { type: 'REMOVE_GAME'; payload: string };

const initialState: GameState = {
  currentGame: null,
  games: [],
  isLoading: false,
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CURRENT_GAME':
      return { ...state, currentGame: action.payload };
    case 'SET_GAMES':
      return { ...state, games: action.payload };
    case 'ADD_GAME':
      return { ...state, games: [...state.games, action.payload] };
    case 'UPDATE_GAME':
      return {
        ...state,
        games: state.games.map(game =>
          game.id === action.payload.id ? action.payload : game
        ),
        currentGame: state.currentGame?.id === action.payload.id 
          ? action.payload 
          : state.currentGame,
      };
    case 'REMOVE_GAME':
      return {
        ...state,
        games: state.games.filter(game => game.id !== action.payload),
        currentGame: state.currentGame?.id === action.payload 
          ? null 
          : state.currentGame,
      };
    default:
      return state;
  }
};

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket, on, off } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const setupSocketListeners = () => {
      // Game events
      on(SOCKET_EVENTS.GAME_CREATED, handleGameCreated);
      on(SOCKET_EVENTS.GAME_JOINED, handleGameJoined);
      on(SOCKET_EVENTS.GAME_STATE_UPDATE, handleGameStateUpdate);
      on(SOCKET_EVENTS.GAME_ENDED, handleGameEnded);
      on(SOCKET_EVENTS.PLAYER_JOINED, handlePlayerJoined);
      on(SOCKET_EVENTS.PLAYER_LEFT, handlePlayerLeft);
      on(SOCKET_EVENTS.GAME_ERROR, handleGameError);
    };

    const cleanupSocketListeners = () => {
      off(SOCKET_EVENTS.GAME_CREATED, handleGameCreated);
      off(SOCKET_EVENTS.GAME_JOINED, handleGameJoined);
      off(SOCKET_EVENTS.GAME_STATE_UPDATE, handleGameStateUpdate);
      off(SOCKET_EVENTS.GAME_ENDED, handleGameEnded);
      off(SOCKET_EVENTS.PLAYER_JOINED, handlePlayerJoined);
      off(SOCKET_EVENTS.PLAYER_LEFT, handlePlayerLeft);
      off(SOCKET_EVENTS.GAME_ERROR, handleGameError);
    };

    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
    };
  }, [socket, on, off]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGameCreated = (data: { game: Game }) => {
    dispatch({ type: 'SET_CURRENT_GAME', payload: data.game });
    dispatch({ type: 'ADD_GAME', payload: data.game });
    toast.success('Game created successfully!');
  };

  const handleGameJoined = (data: { game: Game }) => {
    dispatch({ type: 'SET_CURRENT_GAME', payload: data.game });
    dispatch({ type: 'UPDATE_GAME', payload: data.game });
    toast.success('Joined game successfully!');
  };

  const handleGameStateUpdate = (data: { game: Game }) => {
    dispatch({ type: 'UPDATE_GAME', payload: data.game });
    if (state.currentGame?.id === data.game.id) {
      dispatch({ type: 'SET_CURRENT_GAME', payload: data.game });
    }
  };

  const handleGameEnded = (data: { game: Game; winner?: string; reason?: string }) => {
    dispatch({ type: 'UPDATE_GAME', payload: data.game });
    if (state.currentGame?.id === data.game.id) {
      dispatch({ type: 'SET_CURRENT_GAME', payload: data.game });
    }

    if (data.winner) {
      toast.success(`Game ended! Winner: ${data.winner}`);
    } else {
      toast(`Game ended! ${data.reason || 'Game was abandoned'}`);
    }
  };

  const handlePlayerJoined = (data: { game: Game; player: any }) => {
    dispatch({ type: 'UPDATE_GAME', payload: data.game });
    toast(`${data.player.username} joined the game`);
  };

  const handlePlayerLeft = (data: { game: Game; player: any }) => {
    dispatch({ type: 'UPDATE_GAME', payload: data.game });
    toast.error(`${data.player.username} left the game`);
  };

  const handleGameError = (data: { message: string; code?: string }) => {
    toast.error(data.message);
  };

  const createGame = async (request: CreateGameRequest): Promise<Game> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const game = await gameAPI.createGame(request);
      if (!game) {
        throw new Error('Failed to create game');
      }
      return game;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to create game';
      toast.error(message);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // joinGame removed: not present in new API docs. Use createGame and getGameState instead.

  // Updated makeMove to match new API and add retry logic
  const makeMove = async (request: GameMoveRequest, retry = false): Promise<Game> => {
    try {
      const game = await gameAPI.makeMove(request.roomId, {
        row: request.position.row,
        col: request.position.col
      });
      if (game) {
        return game;
      }
      throw new Error('Move failed');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Invalid move';
      toast.error(message);
      throw new Error(message);
    }
  };

  const forfeitGame = async (roomId: string, retry = false): Promise<Game> => {
    try {
      const game = await gameAPI.forfeitGame(roomId);
      if (game) {
        toast.success('Game forfeited');
        return game;
      }
      throw new Error('Failed to forfeit game');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to forfeit game';
      toast.error(message);
      throw new Error(message);
    }
  };
  // Dummy joinGame to satisfy GameContextType contract (not used)
  const joinGame = async (roomId: string): Promise<any> => {
    throw new Error('joinGame is not implemented. Use createGame and getGameState instead.');
  };

  const getGameState = async (roomId: string, retry = false): Promise<Game> => {
    try {
      const game = await gameAPI.getGameState(roomId);
      if (game) {
        dispatch({ type: 'SET_CURRENT_GAME', payload: game });
        return game;
      }
      throw new Error('Failed to get game state');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to get game state';
      toast.error(message);
      throw new Error(message);
    }
  };

  let activeGamesLoading = false;
  const getActiveGames = async (retry = false): Promise<Game[]> => {
    if (state.isLoading || activeGamesLoading) return state.games;
    activeGamesLoading = true;
    try {
      const games = await gameAPI.getActiveGames();
      dispatch({ type: 'SET_GAMES', payload: games });
      return games;
    } catch (error: any) {
      if (!retry) {
        toast.error('Failed to load active games');
        throw new Error('Failed to load active games');
      }
      return [];
    } finally {
      activeGamesLoading = false;
    }
  };

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const getUserStats = async (): Promise<UserStats> => {
    if (!isAuthenticated || authLoading) {
      throw new Error('Not authenticated');
    }
    try {
      const statsResponse = await gameAPI.getUserGameStats();
      if (statsResponse && typeof statsResponse === 'object') {
        if ('stats' in statsResponse && statsResponse.stats) {
          const s = statsResponse.stats as Partial<UserStats>;
          const isUserStats = (obj: any): obj is UserStats => {
            return obj &&
              typeof obj.level === 'number' &&
              typeof obj.xp === 'number' &&
              typeof obj.gamesPlayed === 'number' &&
              typeof obj.wins === 'number' &&
              typeof obj.losses === 'number' &&
              typeof obj.draws === 'number' &&
              typeof obj.winRate === 'number';
          };
          if (isUserStats(s)) {
            return s as UserStats;
          } else {
            console.error('Malformed user stats object:', s);
          }
        } else {
          console.error('No stats property in response:', statsResponse);
        }
        // Fallback: return default UserStats if missing
        return {
          level: 0,
          xp: 0,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          currentStreak: 0,
        };
      }
      throw new Error('Failed to get user stats: Malformed response');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to get user stats';
      console.error('getUserStats error:', error);
      toast.error(message);
      // Fallback: return default UserStats if error
      return {
        level: 0,
        xp: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        currentStreak: 0,
      };
    }
  };

  const getLeaderboard = async (page = 1, limit = 10): Promise<LeaderboardEntry[]> => {
    try {
      const response = await gameAPI.getLeaderboard(page, limit);
      
      if (response) {
        // Extract the entries array from the leaderboard response
        return response.entries || [];
      }
      return [];
    } catch (error: any) {
      return [];
    }
  };

  // --- Matchmaking APIs ---
  const joinMatchmakingQueue = async (data: any) => {
    try {
      return await gameAPI.joinMatchmakingQueue(data);
    } catch (error) {
      toast.error('Failed to join matchmaking queue');
      throw error;
    }
  };
  const leaveMatchmakingQueue = async () => {
    try {
      return await gameAPI.leaveMatchmakingQueue();
    } catch (error) {
      toast.error('Failed to leave matchmaking queue');
      throw error;
    }
  };
  const getMatchmakingStatus = async () => {
    try {
      return await gameAPI.getMatchmakingStatus();
    } catch (error) {
      toast.error('Failed to get matchmaking status');
      throw error;
    }
  };
  const getQueueStats = async () => {
    try {
      return await gameAPI.getQueueStats();
    } catch (error) {
      toast.error('Failed to get queue stats');
      throw error;
    }
  };
  // --- Game History ---
  const getGameHistory = async (page = 1, limit = 10) => {
    try {
      return await gameAPI.getGameHistory(page, limit);
    } catch (error) {
      toast.error('Failed to get game history');
      throw error;
    }
  };
  // --- Admin APIs ---
  const forceMatch = async (player1Id: string, player2Id: string) => {
    try {
      return await gameAPI.forceMatch(player1Id, player2Id);
    } catch (error) {
      toast.error('Failed to force match');
      throw error;
    }
  };
  const cleanupQueue = async () => {
    try {
      return await gameAPI.cleanupQueue();
    } catch (error) {
      toast.error('Failed to cleanup queue');
      throw error;
    }
  };

  const value: GameContextType = {
    joinGame,
    currentGame: state.currentGame,
    games: state.games,
    isLoading: state.isLoading,
    createGame,
    makeMove,
    forfeitGame,
    getGameState,
    getActiveGames,
    getUserStats,
    getLeaderboard,
    joinMatchmakingQueue,
    leaveMatchmakingQueue,
    getMatchmakingStatus,
    getQueueStats,
    getGameHistory,
    forceMatch,
    cleanupQueue,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
