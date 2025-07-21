
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
    apiClient.post<{ data: Game }>(
      '/game/create',
      data
    ).then(res => res.data?.data),

  getGameState: (roomId: string) =>
    apiClient.get<{ data: { gameState: Game } }>(
      `/game/state/${roomId}`
    ).then(res => res.data?.data?.gameState),

  getActiveGames: () =>
    apiClient.get<{ data: { games: Game[] } }>(
      '/game/active'
    ).then(res => res.data?.data?.games || []),

  forfeitGame: (roomId: string) =>
    apiClient.post<{ data: { gameState: Game } }>(
      `/game/forfeit/${roomId}`
    ).then(res => res.data?.data?.gameState),

  getUserGameStats: () =>
    apiClient.get<{ data: { stats: UserStats; recentGames: Game[] } }>(
      '/game/stats'
    ).then(res => res.data?.data),

  getLeaderboard: (page: number = 1, limit: number = 20, timeframe: string = 'all') =>
    apiClient.get<{ data: LeaderboardResponse }>(
      `/game/leaderboard?page=${page}&limit=${limit}&timeframe=${timeframe}`
    ).then(res => res.data?.data),

  makeMove: (roomId: string, data: MakeMoveRequest) =>
    apiClient.post<{ data: { gameState: Game } }>(
      `/game/move/${roomId}`,
      data
    ).then(res => res.data?.data?.gameState),

  getGameHistory: (page: number = 1, limit: number = 10) =>
    apiClient.get<{ data: { games: Game[]; pagination: any } }>(
      `/game/history?page=${page}&limit=${limit}`
    ).then(res => res.data?.data),

  // Matchmaking
  joinMatchmakingQueue: (data: MatchmakingRequest) =>
    apiClient.post<{ data: any }>(
      '/game/matchmaking/join',
      data
    ).then(res => res.data?.data),

  leaveMatchmakingQueue: () =>
    apiClient.post('/game/matchmaking/leave').then(res => res.data),

  getMatchmakingStatus: () =>
    apiClient.get<{ data: any }>(
      '/game/matchmaking/status'
    ).then(res => res.data?.data),

  getQueueStats: () =>
    apiClient.get<{ data: any }>(
      '/game/matchmaking/stats'
    ).then(res => res.data?.data),

  // Admin only
  forceMatch: (player1Id: string, player2Id: string) =>
    apiClient.post('/game/admin/force-match', { player1Id, player2Id }).then(res => res.data),

  cleanupQueue: () =>
    apiClient.post('/game/admin/cleanup-queue').then(res => res.data),
};

export default gameAPI;
