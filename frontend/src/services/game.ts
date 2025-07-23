import { apiClient } from './api';
import {
  Game,
  CreateGameRequest,
  MakeMoveRequest,
  LeaderboardResponse,
  UserStats,
  MatchmakingRequest
} from '../types';

export const gameAPI = {
  // Game management - Updated to match exact API documentation
  createGame: (data: CreateGameRequest) => {
    console.log('🚀 Creating game with data:', data);
    console.log('📡 Calling endpoint: /game/rooms');
    return apiClient.post<{ data: { game: Game } }>(
      '/game/rooms',
      data
    ).then(res => {
      console.log('✅ CreateGame response:', res.data);
      return res.data?.data?.game || res.data?.data;
    }).catch(error => {
      console.error('❌ CreateGame error:', error.response?.status, error.response?.data);
      throw error;
    });
  },

  joinGame: (gameId: string, password?: string) =>
    apiClient.post<{ data: any }>(
      `/game/join/${gameId}`,
      password ? { password } : {}
    ).then(res => res.data?.data),

  getGameState: (roomId: string) =>
    apiClient.get<{ data: { gameState: Game } }>(
      `/game/state/${roomId}`
    ).then(res => res.data?.data?.gameState || res.data?.data),

  getActiveGames: () =>
    apiClient.get<{ data: { activeGames: Game[] } }>(
      '/game/active-games'
    ).then(res => res.data?.data?.activeGames || res.data?.data || []),

  forfeitGame: (roomId: string) =>
    apiClient.post<{ data: any }>(
      `/game/forfeit/${roomId}`
    ).then(res => res.data?.data),

  getUserGameStats: () =>
    apiClient.get<{ success: boolean; data: { stats: UserStats; recentGames: Game[] } }>(
      '/game/stats'
    ).then(res => {
      // Validate response structure and extract stats
      if (res.data && res.data.success && res.data.data && res.data.data.stats) {
        return res.data.data.stats; // Return just the stats object
      } else if (res.data && res.data.data && res.data.data.stats) {
        // Handle case where success field might be missing
        return res.data.data.stats; // Return just the stats object
      } else {
        console.error('Invalid getUserGameStats response structure:', res.data);
        throw new Error('Invalid response format from server');
      }
    }).catch(error => {
      console.error('getUserGameStats API error:', error);
      throw error;
    }),

  getLeaderboard: (page: number = 1, limit: number = 20, timeframe: string = 'all') =>
    apiClient.get<{ data: LeaderboardResponse }>(
      `/game/leaderboard?page=${page}&limit=${limit}&timeframe=${timeframe}`
    ).then(res => res.data?.data),

  makeMove: (gameId: string, data: MakeMoveRequest) =>
    apiClient.post<{ data: { game: Game; move: any; player: any } }>(
      `/game/move`,
      { gameId, ...data }
    ).then(res => res.data?.data?.game || res.data?.data),

  getGameHistory: (page: number = 1, limit: number = 10) =>
    apiClient.get<{ data: { games: Game[]; pagination: any } }>(
      `/game/history?page=${page}&limit=${limit}`
    ).then(res => res.data?.data),

  // Matchmaking
  joinMatchmakingQueue: (data: MatchmakingRequest) =>
    apiClient.post<{ data: any }>(
      '/game/matchmaking/find',
      data
    ).then(res => res.data?.data),

  leaveMatchmakingQueue: () =>
    apiClient.delete('/game/matchmaking/cancel').then(res => res.data),

  getMatchmakingStatus: () =>
    apiClient.get<{ data: any }>(
      '/game/matchmaking/status'
    ).then(res => res.data?.data),

  getQueueStats: () =>
    apiClient.get<{ success: boolean; data: any }>(
      '/game/matchmaking/stats',
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    ).then(res => {
      if (res.data?.success && res.data?.data) {
        return res.data.data;
      }
      throw new Error('Invalid stats response format');
    }).catch(error => {
      console.error('Error fetching queue stats:', error);
      // Return fallback data
      return {
        totalPlayers: 0,
        averageWaitTime: 0,
        levelDistribution: {},
        connectedSockets: 0,
        authenticatedUsers: 0,
        error: 'Stats unavailable'
      };
    }),

  // Admin only
  forceMatch: (player1Id: string, player2Id: string) =>
    apiClient.post('/game/admin/force-match', { player1Id, player2Id }).then(res => res.data),

  cleanupQueue: () =>
    apiClient.post('/game/admin/cleanup-queue').then(res => res.data),
};

export default gameAPI;


