import { Types } from 'mongoose';
import { logError, logDebug } from './logger';

export interface Player {
  userId: Types.ObjectId;
  username: string;
  level: number;
  rating?: number;
  socketId: string;
  joinedAt: Date;
}

export interface MatchmakingOptions {
  levelTolerance: number;
  maxWaitTime: number; // in milliseconds
  preferSimilarLevel: boolean;
}

export interface MatchResult {
  player1: Player;
  player2: Player;
  roomId: string;
  matchQuality: number; // 0-1, higher is better match
}

export interface PlayerValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedPlayer?: Player;
}

export class MatchmakingManager {
  private static queue: Map<string, Player> = new Map();
  private static readonly DEFAULT_OPTIONS: MatchmakingOptions = {
    levelTolerance: 2,
    maxWaitTime: 30000, // 30 seconds
    preferSimilarLevel: true
  };

  // Rate limiting for matchmaking abuse
  private static playerActionHistory: Map<string, Date[]> = new Map();
  private static readonly MAX_ACTIONS_PER_MINUTE = 10;

  /**
   * Validate player data with comprehensive checks
   */
  private static validatePlayer(player: any): PlayerValidationResult {
    const errors: string[] = [];

    if (!player || typeof player !== 'object') {
      errors.push('Player must be a valid object');
      return { isValid: false, errors };
    }

    // Validate userId
    if (!player.userId || !Types.ObjectId.isValid(player.userId)) {
      errors.push('Player must have a valid userId');
    }

    // Validate username
    if (!player.username || typeof player.username !== 'string') {
      errors.push('Player must have a valid username');
    } else if (player.username.length < 3 || player.username.length > 20) {
      errors.push('Username must be between 3 and 20 characters');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(player.username)) {
      errors.push('Username contains invalid characters');
    }

    // Validate level
    if (typeof player.level !== 'number' || !Number.isInteger(player.level)) {
      errors.push('Player level must be a valid integer');
    } else if (player.level < 1 || player.level > 100) {
      errors.push('Player level must be between 1 and 100');
    }

    // Validate rating if provided
    if (player.rating !== undefined) {
      if (typeof player.rating !== 'number' || player.rating < 0 || player.rating > 3000) {
        errors.push('Player rating must be a number between 0 and 3000');
      }
    }

    // Validate socketId
    if (!player.socketId || typeof player.socketId !== 'string') {
      errors.push('Player must have a valid socketId');
    }

    // Validate joinedAt
    if (player.joinedAt && !(player.joinedAt instanceof Date)) {
      errors.push('joinedAt must be a valid Date');
    }

    const sanitizedPlayer: Player = {
      userId: player.userId,
      username: player.username?.trim(),
      level: Math.max(1, Math.min(100, Math.floor(player.level || 1))),
      rating: player.rating ? Math.max(0, Math.min(3000, player.rating)) : undefined,
      socketId: player.socketId?.trim(),
      joinedAt: player.joinedAt instanceof Date ? player.joinedAt : new Date()
    };

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedPlayer: errors.length === 0 ? sanitizedPlayer : undefined
    };
  }

  /**
   * Check rate limiting for player actions
   */
  private static isRateLimited(userId: string): boolean {
    try {
      const now = new Date();
      const userActions = this.playerActionHistory.get(userId) || [];
      
      // Remove actions older than 1 minute
      const recentActions = userActions.filter(
        action => now.getTime() - action.getTime() < 60000
      );

      if (recentActions.length >= this.MAX_ACTIONS_PER_MINUTE) {
        return true;
      }

      // Update action history
      recentActions.push(now);
      this.playerActionHistory.set(userId, recentActions);
      
      return false;
    } catch (error) {
      logError(`Rate limiting check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false; // Allow on error to prevent blocking legitimate users
    }
  }

  /**
   * Generate secure room ID
   */
  private static generateRoomId(): string {
    try {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 10);
      const extra = Math.random().toString(36).substring(2, 6);
      return `room_${timestamp}_${random}_${extra}`;
    } catch (error) {
      logError(`Room ID generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
  }

  /**
   * Add player to matchmaking queue with validation and rate limiting
   */
  static addToQueue(player: Player): { success: boolean; error?: string } {
    try {
      const validation = this.validatePlayer(player);
      if (!validation.isValid) {
        logError(`Player validation failed: ${validation.errors.join(', ')}`);
        return { success: false, error: validation.errors[0] };
      }

      const userId = validation.sanitizedPlayer!.userId.toString();

      // Check rate limiting
      if (this.isRateLimited(userId)) {
        logError(`Rate limited player attempting to join queue: ${userId}`);
        return { success: false, error: 'Too many queue actions. Please wait a moment.' };
      }

      // Check if player is already in queue
      if (this.queue.has(userId)) {
        return { success: false, error: 'Player already in queue' };
      }

      this.queue.set(userId, {
        ...validation.sanitizedPlayer!,
        joinedAt: new Date()
      });

      logDebug(`Player ${validation.sanitizedPlayer!.username} added to matchmaking queue`);
      return { success: true };
    } catch (error) {
      logError(`Add to queue error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, error: 'Failed to add player to queue' };
    }
  }

  /**
   * Remove player from matchmaking queue
   */
  static removeFromQueue(userId: string): boolean {
    return this.queue.delete(userId);
  }

  /**
   * Get player from queue
   */
  static getPlayerFromQueue(userId: string): Player | undefined {
    return this.queue.get(userId);
  }

  /**
   * Get all players in queue
   */
  static getQueuedPlayers(): Player[] {
    return Array.from(this.queue.values());
  }

  /**
   * Find match for a player
   */
  static findMatch(
    playerId: string,
    options: Partial<MatchmakingOptions> = {}
  ): MatchResult | null {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const player = this.queue.get(playerId);
    
    if (!player) {
      return null;
    }

    const availablePlayers = Array.from(this.queue.values()).filter(
      p => p.userId.toString() !== playerId
    );

    if (availablePlayers.length === 0) {
      return null;
    }

    // Find best match
    let bestMatch: Player | null = null;
    let bestScore = -1;

    for (const opponent of availablePlayers) {
      const score = this.calculateMatchScore(player, opponent, opts);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = opponent;
      }
    }

    if (bestMatch && this.isAcceptableMatch(player, bestMatch, opts)) {
      // Remove both players from queue
      this.removeFromQueue(playerId);
      this.removeFromQueue(bestMatch.userId.toString());

      return {
        player1: player,
        player2: bestMatch,
        roomId: this.generateRoomId(),
        matchQuality: bestScore
      };
    }

    return null;
  }

  /**
   * Calculate match score between two players
   */
  private static calculateMatchScore(
    player1: Player,
    player2: Player,
    options: MatchmakingOptions
  ): number {
    let score = 0;

    // Level difference score (0-0.5)
    const levelDiff = Math.abs(player1.level - player2.level);
    const levelScore = Math.max(0, 0.5 - (levelDiff / options.levelTolerance) * 0.5);
    score += levelScore;

    // Wait time score (0-0.3)
    const now = new Date();
    const player1WaitTime = now.getTime() - player1.joinedAt.getTime();
    const player2WaitTime = now.getTime() - player2.joinedAt.getTime();
    const avgWaitTime = (player1WaitTime + player2WaitTime) / 2;
    const waitScore = Math.min(0.3, (avgWaitTime / options.maxWaitTime) * 0.3);
    score += waitScore;

    // Rating difference score if available (0-0.2)
    if (player1.rating && player2.rating) {
      const ratingDiff = Math.abs(player1.rating - player2.rating);
      const ratingScore = Math.max(0, 0.2 - (ratingDiff / 500) * 0.2);
      score += ratingScore;
    }

    return Math.min(1, score);
  }

  /**
   * Check if match is acceptable
   */
  private static isAcceptableMatch(
    player1: Player,
    player2: Player,
    options: MatchmakingOptions
  ): boolean {
    const levelDiff = Math.abs(player1.level - player2.level);
    const now = new Date();
    const player1WaitTime = now.getTime() - player1.joinedAt.getTime();

    // If player has been waiting too long, be more lenient
    if (player1WaitTime > options.maxWaitTime) {
      return levelDiff <= options.levelTolerance * 2;
    }

    return levelDiff <= options.levelTolerance;
  }

  /**
   * Get queue statistics with enhanced validation
   */
  static getQueueStats(): {
    totalPlayers: number;
    averageWaitTime: number;
    levelDistribution: Record<number, number>;
  } {
    const players = Array.from(this.queue.values());
    const now = new Date();

    const totalPlayers = players.length;
    const averageWaitTime = players.length > 0
      ? players.reduce((sum, p) => sum + (now.getTime() - p.joinedAt.getTime()), 0) / players.length
      : 0;

    const levelDistribution: Record<number, number> = {};
    players.forEach(p => {
      levelDistribution[p.level] = (levelDistribution[p.level] || 0) + 1;
    });

    return {
      totalPlayers,
      averageWaitTime,
      levelDistribution
    };
  }

  /**
   * Clean up expired queue entries
   */
  static cleanupQueue(maxAge: number = 300000): number { // 5 minutes default
    const now = new Date();
    let removedCount = 0;

    for (const [userId, player] of this.queue.entries()) {
      if (now.getTime() - player.joinedAt.getTime() > maxAge) {
        this.queue.delete(userId);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Force match for testing or admin purposes
   */
  static forceMatch(player1Id: string, player2Id: string): MatchResult | null {
    const player1 = this.queue.get(player1Id);
    const player2 = this.queue.get(player2Id);

    if (!player1 || !player2) {
      return null;
    }

    this.removeFromQueue(player1Id);
    this.removeFromQueue(player2Id);

    return {
      player1,
      player2,
      roomId: this.generateRoomId(),
      matchQuality: 1.0 // Perfect match since it's forced
    };
  }

  /**
   * Get estimated wait time for a player
   */
  static getEstimatedWaitTime(player: Player): number {
    const queuedPlayers = Array.from(this.queue.values()).filter(
      p => p.userId.toString() !== player.userId.toString()
    );

    if (queuedPlayers.length === 0) {
      return 60000; // 1 minute if no one in queue
    }

    // Find players within level tolerance
    const compatiblePlayers = queuedPlayers.filter(
      p => Math.abs(p.level - player.level) <= this.DEFAULT_OPTIONS.levelTolerance
    );

    if (compatiblePlayers.length > 0) {
      return 5000; // 5 seconds if compatible players available
    }

    // Estimate based on queue activity
    const avgLevel = queuedPlayers.reduce((sum, p) => sum + p.level, 0) / queuedPlayers.length;
    const levelDiff = Math.abs(player.level - avgLevel);

    return Math.min(this.DEFAULT_OPTIONS.maxWaitTime, 10000 + (levelDiff * 2000));
  }

  /**
   * Check if player is in queue
   */
  static isPlayerInQueue(userId: string): boolean {
    return this.queue.has(userId);
  }

  /**
   * Get queue position for a player
   */
  static getQueuePosition(userId: string): number {
    const player = this.queue.get(userId);
    if (!player) {
      return -1;
    }

    const queuedPlayers = Array.from(this.queue.values()).sort(
      (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime()
    );

    return queuedPlayers.findIndex(p => p.userId.toString() === userId) + 1;
  }
}
