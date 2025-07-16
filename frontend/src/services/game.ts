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
    apiClient.post<{ data: Game }>('/game/create', data).then(res => res.data?.data),

  joinGame: (gameId: string) => 
    apiClient.post<{ data: Game }>(`/game/${gameId}/join`).then(res => res.data?.data),

  getGameState: (gameId: string) => 
    apiClient.get<{ data: Game }>(`/game/${gameId}`).then(res => res.data?.data),

  getActiveGames: () => 
    apiClient.get<{ data: { games: Game[]; totalActiveGames: number } }>('/game/active').then(res => res.data?.data),

  makeMove: (gameId: string, data: MakeMoveRequest) => 
    apiClient.post<{ data: Game }>(`/game/${gameId}/move`, data).then(res => res.data?.data),

  forfeitGame: (roomId: string) => 
    apiClient.post<{ data: Game }>(`/game/forfeit/${roomId}`).then(res => res.data?.data),

  getUserGameStats: () => 
    apiClient.get<{ data: UserStats }>('/game/stats').then(res => res.data?.data),

  getLeaderboard: (page: number = 1, limit: number = 10) => 
    apiClient.get<{ data: LeaderboardResponse }>(`/game/leaderboard?page=${page}&limit=${limit}`).then(res => res.data?.data),

  getGameHistory: (page: number = 1, limit: number = 10) =>
    apiClient.get<{ data: { games: Game[]; pagination: any } }>(`/game/history?page=${page}&limit=${limit}`).then(res => res.data?.data),

  // Matchmaking
  joinMatchmakingQueue: (data: MatchmakingRequest) => 
    apiClient.post<{ data: MatchmakingStatus }>('/game/matchmaking/join', data).then(res => res.data?.data),

  leaveMatchmakingQueue: () => 
    apiClient.post('/game/matchmaking/leave').then(res => res.data),

  getMatchmakingStatus: () => 
    apiClient.get<{ data: MatchmakingStatus }>('/game/matchmaking/status').then(res => res.data?.data),

  getQueueStats: () => 
    apiClient.get<{ data: QueueStats }>('/game/matchmaking/stats').then(res => res.data?.data),

  // Admin only
  forceMatch: (player1Id: string, player2Id: string) => 
    apiClient.post('/game/admin/force-match', { player1Id, player2Id }).then(res => res.data),

  cleanupQueue: () => 
    apiClient.post('/game/admin/cleanup-queue').then(res => res.data),
};

export default gameAPI;
