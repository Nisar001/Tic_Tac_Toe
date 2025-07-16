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
    const response = await apiClient.get('/game/matchmaking/stats');
    return response.data;
  },
};
