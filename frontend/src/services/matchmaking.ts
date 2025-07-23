import { apiClient } from './api';

export interface MatchmakingPreferences {
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  gameMode?: 'quick' | 'ranked' | 'custom';
  timeControl?: 'blitz' | 'standard' | 'extended';
}

export interface MatchmakingStatus {
  inQueue: boolean;
  estimatedWaitTime?: number;
  queuePosition?: number;
  preferences: MatchmakingPreferences;
  joinedAt?: string;
}

export interface MatchFound {
  gameId: string;
  gameRoomId: string;
  opponent: {
    id: string;
    username: string;
    skillLevel: string;
    avatar?: string;
  };
  gameSettings: {
    timeControl: string;
    gameMode: string;
  };
}

export interface MatchmakingStats {
  totalPlayersInQueue: number;
  averageWaitTime: number;
  peakHours: string[];
  skillDistribution: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
}

export const matchmakingService = {
  // Join the matchmaking queue
  joinQueue: async (preferences?: MatchmakingPreferences): Promise<MatchmakingStatus> => {
    const response = await apiClient.post('/game/matchmaking/join', { preferences });
    return response.data;
  },

  // Leave the matchmaking queue
  leaveQueue: async (): Promise<void> => {
    await apiClient.post('/game/matchmaking/leave');
  },

  // Get current matchmaking status
  getStatus: async (): Promise<MatchmakingStatus> => {
    const response = await apiClient.get('/game/matchmaking/status');
    return response.data;
  },

  // Get matchmaking statistics
  getStats: async (): Promise<MatchmakingStats> => {
    try {
      const response = await apiClient.get('/game/matchmaking/stats', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.data?.success && response.data?.data) {
        // Map backend response to frontend interface
        const backendData = response.data.data;
        return {
          totalPlayersInQueue: backendData.totalPlayers || 0,
          averageWaitTime: backendData.averageWaitTime || 0,
          peakHours: backendData.peakHours || [],
          skillDistribution: {
            beginner: backendData.levelDistribution?.[0] || 0,
            intermediate: backendData.levelDistribution?.[1] || 0,
            advanced: backendData.levelDistribution?.[2] || 0
          }
        };
      }
      
      throw new Error('Invalid stats response format');
    } catch (error) {
      console.error('Error fetching matchmaking stats:', error);
      // Return fallback stats matching the interface
      return {
        totalPlayersInQueue: 0,
        averageWaitTime: 0,
        peakHours: [],
        skillDistribution: {
          beginner: 0,
          intermediate: 0,
          advanced: 0
        }
      };
    }
  },
};


