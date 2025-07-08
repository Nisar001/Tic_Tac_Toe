import { Types } from 'mongoose';

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

export class MatchmakingManager {
  private static queue: Map<string, Player> = new Map();
  private static readonly DEFAULT_OPTIONS: MatchmakingOptions = {
    levelTolerance: 2,
    maxWaitTime: 30000, // 30 seconds
    preferSimilarLevel: true
  };

  /**
   * Add player to matchmaking queue
   */
  static addToQueue(player: Player): void {
    this.queue.set(player.userId.toString(), {
      ...player,
      joinedAt: new Date()
    });
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
   * Generate unique room ID
   */
  private static generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get queue statistics
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
