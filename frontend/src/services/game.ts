import { apiClient } from './api';
import { 
  Game, 
  CreateGameRequest, 
  MakeMoveRequest, 
  LeaderboardResponse,
  UserStats,
  MatchmakingRequest,
  MatchmakingStatus,
  QueueStats
} from '../types';

export const gameAPI = {
  // Game management
  createGame: (data: CreateGameRequest) => 
    apiClient.post<Game>('/game/create', data),

  joinGame: (roomId: string) => 
    apiClient.post(`/game/join/${roomId}`),

  getGameState: (roomId: string) => 
    apiClient.get<Game>(`/game/state/${roomId}`),

  getActiveGames: () => 
    apiClient.get<Game[]>('/game/active'),

  makeMove: (roomId: string, data: MakeMoveRequest) => 
    apiClient.post<Game>(`/game/move/${roomId}`, data),

  forfeitGame: (roomId: string) => 
    apiClient.post<Game>(`/game/forfeit/${roomId}`),

  getUserGameStats: () => 
    apiClient.get<UserStats>('/game/stats'),

  getLeaderboard: (page: number = 1, limit: number = 10) => 
    apiClient.get<LeaderboardResponse>(`/game/leaderboard?page=${page}&limit=${limit}`),

  // Matchmaking
  joinMatchmakingQueue: (data: MatchmakingRequest) => 
    apiClient.post('/game/matchmaking/join', data),

  leaveMatchmakingQueue: () => 
    apiClient.post('/game/matchmaking/leave'),

  getMatchmakingStatus: () => 
    apiClient.get<MatchmakingStatus>('/game/matchmaking/status'),

  getQueueStats: () => 
    apiClient.get<QueueStats>('/game/matchmaking/stats'),

  // Admin only
  forceMatch: (player1Id: string, player2Id: string) => 
    apiClient.post('/game/matchmaking/force-match', { player1Id, player2Id }),

  cleanupQueue: () => 
    apiClient.post('/game/matchmaking/cleanup'),
};

export default gameAPI;
