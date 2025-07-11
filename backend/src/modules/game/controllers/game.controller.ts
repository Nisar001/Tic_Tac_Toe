// Game Controllers - Re-exports for easy importing
export { createCustomGame } from './createCustomGame.controller';
export { getGameState } from './getGameState.controller';
export { makeMove } from './makeMove.controller';
export { forfeitGame } from './forfeitGame.controller';
export { getLeaderboard } from './getLeaderboard.controller';
export { getUserGameStats } from './getUserGameStats.controller';
export { getActiveGames } from './getActiveGames.controller';

// Matchmaking controllers
export { 
  joinQueue,
  leaveQueue,
  getMatchmakingStatus,
  forceMatch,
  getQueueStats,
  cleanupQueue
} from './matchmaking.controller';

// Import individual controllers for default export
import { createCustomGame } from './createCustomGame.controller';
import { getGameState } from './getGameState.controller';
import { makeMove } from './makeMove.controller';
import { forfeitGame } from './forfeitGame.controller';
import { getLeaderboard } from './getLeaderboard.controller';
import { getUserGameStats } from './getUserGameStats.controller';
import { getActiveGames } from './getActiveGames.controller';
import { 
  joinQueue,
  leaveQueue,
  getMatchmakingStatus,
  forceMatch,
  getQueueStats,
  cleanupQueue
} from './matchmaking.controller';

// Default export with all controllers
export default {
  // Game management
  createCustomGame,
  getGameState,
  makeMove,
  forfeitGame,
  getLeaderboard,
  getUserGameStats,
  getActiveGames,
  
  // Matchmaking
  joinQueue,
  leaveQueue,
  getMatchmakingStatus,
  forceMatch,
  getQueueStats,
  cleanupQueue,
};