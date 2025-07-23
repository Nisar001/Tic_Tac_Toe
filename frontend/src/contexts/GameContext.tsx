import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import gameAPI from '../services/game';
import { useSocket } from './SocketContext';
import { useAPIManager } from './APIManagerContext';
import { SOCKET_EVENTS } from '../constants';
import {
  GameContextType,
  Game,
  CreateGameRequest,
  MakeMoveRequest,
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
  const { executeAPI } = useAPIManager();

  useEffect(() => {
    if (!socket) return;

    const setupSocketListeners = () => {
      // Game events - updated to match API documentation
      on(SOCKET_EVENTS.GAME_UPDATE, handleGameUpdate);
      on(SOCKET_EVENTS.MOVE_RESULT, handleMoveResult);
      on(SOCKET_EVENTS.GAME_OVER, handleGameOver);
      on(SOCKET_EVENTS.PLAYER_JOINED, handlePlayerJoined);
      on(SOCKET_EVENTS.PLAYER_LEFT, handlePlayerLeft);
      on(SOCKET_EVENTS.GAME_ERROR, handleGameError);
    };

    const cleanupSocketListeners = () => {
      off(SOCKET_EVENTS.GAME_UPDATE, handleGameUpdate);
      off(SOCKET_EVENTS.MOVE_RESULT, handleMoveResult);
      off(SOCKET_EVENTS.GAME_OVER, handleGameOver);
      off(SOCKET_EVENTS.PLAYER_JOINED, handlePlayerJoined);
      off(SOCKET_EVENTS.PLAYER_LEFT, handlePlayerLeft);
      off(SOCKET_EVENTS.GAME_ERROR, handleGameError);
    };

    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
    };
  }, [socket, on, off]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGameUpdate = (data: { game: Game }) => {
    dispatch({ type: 'SET_CURRENT_GAME', payload: data.game });
    dispatch({ type: 'ADD_GAME', payload: data.game });
    toast.success('Game created successfully!');
  };

  const handleMoveResult = (data: { game: Game }) => {
    dispatch({ type: 'SET_CURRENT_GAME', payload: data.game });
    dispatch({ type: 'UPDATE_GAME', payload: data.game });
    toast.success('Joined game successfully!');
  };

  const handleGameOver = (data: { game: Game; winner?: string; reason?: string; stats?: UserStats }) => {
    dispatch({ type: 'UPDATE_GAME', payload: data.game });
    if (state.currentGame?.id === data.game.id) {
      dispatch({ type: 'SET_CURRENT_GAME', payload: data.game });
    }

    // Update user stats if provided in the game over response
    if (data.stats) {
      updateUserStats(data.stats);
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
    const result = await executeAPI(
      'createGame',
      () => gameAPI.createGame(request),
      {
        maxRetries: 3,
        showToast: true,
        preventDuplicates: true
      }
    );
    if (!result) {
      throw new Error('Failed to create game');
    }
    // Handle different response structures
    if (result && typeof result === 'object' && 'game' in result) {
      return (result as any).game;
    }
    return result as Game;
  };

  // joinGame removed: not present in new API docs. Use createGame and getGameState instead.

  // Updated makeMove to match new API and add retry logic
  const makeMove = async (roomId: string, moveRequest: MakeMoveRequest, retry = false): Promise<Game> => {
    try {
      const response = await gameAPI.makeMove(roomId, moveRequest);
      
      // Handle different response formats from backend
      let game: Game;
      if (response && typeof response === 'object') {
        if ('game' in response) {
          game = response.game as Game;
        } else {
          game = response as Game;
        }
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

  // Real joinGame implementation - Updated to handle backend response format
  const joinGame = async (roomId: string, password?: string): Promise<Game> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await gameAPI.joinGame(roomId, password);
      
      if (!result) {
        throw new Error('Failed to join game');
      }
      
      // Handle different response formats from backend
      let game: Game;
      if (result.gameId || result.roomId) {
        // Successfully joined, fetch current game state
        game = await getGameState(result.roomId || result.gameId || roomId);
      } else {
        // Response might contain the game data directly
        game = result as Game;
        dispatch({ type: 'SET_CURRENT_GAME', payload: game });
      }
      
      toast.success(result.message || 'Joined game successfully!');
      return game;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to join game';
      toast.error(message);
      throw new Error(message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getGameState = async (roomId: string, retry = false): Promise<Game> => {
    try {
      const gameResult = await gameAPI.getGameState(roomId);
      
      // Handle different response formats from backend
      let game: Game;
      if (gameResult && typeof gameResult === 'object') {
        if ('gameState' in gameResult) {
          game = gameResult.gameState as Game;
        } else {
          game = gameResult as Game;
        }
      } else {
        throw new Error('Invalid game state response');
      }
      
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
      const gamesResult = await gameAPI.getActiveGames();
      
      // Handle different response formats from backend
      let games: Game[];
      if (Array.isArray(gamesResult)) {
        games = gamesResult;
      } else if (gamesResult && typeof gamesResult === 'object' && 'games' in gamesResult) {
        games = (gamesResult as any).games;
      } else {
        games = [];
      }
      
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

  const { isAuthenticated, isLoading: authLoading, updateUserStats } = useAuth();
  const getUserStats = async (): Promise<UserStats> => {
    if (!isAuthenticated || authLoading) {
      throw new Error('Not authenticated');
    }
    try {
      const statsResponse: any = await gameAPI.getUserGameStats();

      // Handle different response formats
      let statsData: any = null;
      
      if (statsResponse && typeof statsResponse === 'object') {
        // Check if statsResponse has 'stats' property (expected format)
        if ('stats' in statsResponse && statsResponse.stats) {
          statsData = statsResponse.stats;
        }
        // Check if statsResponse itself contains the stats (alternative format)
        else if ('gamesPlayed' in statsResponse || 'wins' in statsResponse) {
          statsData = statsResponse;
        }
        // Check if it's wrapped in a data property
        else if ('data' in statsResponse && statsResponse.data && 
                 typeof statsResponse.data === 'object' && 
                 statsResponse.data !== null && 
                 'stats' in statsResponse.data) {
          statsData = (statsResponse as any).data.stats;
        }
      }
      
      if (statsData && typeof statsData === 'object') {
        // Accept partial UserStats, fallback for missing fields
        return {
          level: typeof statsData.level === 'number' ? statsData.level : 0,
          xp: typeof statsData.xp === 'number' ? statsData.xp : 0,
          gamesPlayed: typeof statsData.gamesPlayed === 'number' ? statsData.gamesPlayed : 0,
          wins: typeof statsData.wins === 'number' ? statsData.wins : 0,
          losses: typeof statsData.losses === 'number' ? statsData.losses : 0,
          draws: typeof statsData.draws === 'number' ? statsData.draws : 0,
          winRate: typeof statsData.winRate === 'number' ? statsData.winRate : 0,
          currentStreak: typeof statsData.currentStreak === 'number' ? statsData.currentStreak : 0,
          longestStreak: typeof statsData.longestStreak === 'number' ? statsData.longestStreak : 0,
          totalScore: typeof statsData.totalScore === 'number' ? statsData.totalScore : 0,
          averageGameDuration: typeof statsData.averageGameDuration === 'number' ? statsData.averageGameDuration : 0,
          rank: typeof statsData.rank === 'string' ? statsData.rank : undefined,
          ranking: typeof statsData.ranking === 'number' ? statsData.ranking : undefined,
        };
      } else {
        console.error('Malformed user stats object. Expected format not found:', statsResponse);

        // Don't show error toast for malformed data, just log it and return defaults
        console.warn('Using default stats due to response format mismatch');
        return {
          level: 0,
          xp: 0,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalScore: 0,
          averageGameDuration: 0,
        };
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to get user stats';
      console.error('getUserStats error:', error);
      
      // Only show toast for actual network/server errors, not data format issues
      if (error?.response?.status && error.response.status >= 400) {
        toast.error(message);
      }
      
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
        longestStreak: 0,
        totalScore: 0,
        averageGameDuration: 0,
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


