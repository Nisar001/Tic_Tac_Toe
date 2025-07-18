import { config } from '../config';
import { logError, logDebug } from './logger';

export interface LivesStatus {
  currentLives: number;
  maxLives: number;
  nextRegenTime: Date | null;
  timeUntilNextRegen: number; // in milliseconds
  canPlay: boolean;
}

export interface LivesValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: number;
}

export class LivesManager {
  /**
   * Calculate current lives based on last lives update
   * Enhanced with robust validation and error handling
   */
  public static calculateCurrentLives(
    lastLives: number,
    lastLivesUpdate: Date,
    lastLivesRegenTime?: Date
  ): LivesStatus {
    try {
      // Input validation
      const validation = this.validateLivesInputs(lastLives, lastLivesUpdate, lastLivesRegenTime);
      if (!validation.isValid) {
        logError(`Lives calculation failed: ${validation.errors.join(', ')}`);
        return {
          currentLives: 0,
          maxLives: this.MAX_LIVES,
          nextRegenTime: null,
          timeUntilNextRegen: 0,
          canPlay: false
        };
      }

      const now = new Date();
      const sanitizedLives = validation.sanitizedValue!;
      
      // If already at max lives, no need to calculate regeneration
      if (sanitizedLives >= this.MAX_LIVES) {
        return {
          currentLives: this.MAX_LIVES,
          maxLives: this.MAX_LIVES,
          nextRegenTime: null,
          timeUntilNextRegen: 0,
          canPlay: true
        };
      }

      // Calculate lives regeneration with safeguards
      const timeSinceLastRegen = lastLivesRegenTime 
        ? Math.max(0, now.getTime() - lastLivesRegenTime.getTime())
        : Math.max(0, now.getTime() - lastLivesUpdate.getTime());

      const livesToRegenerate = Math.floor(timeSinceLastRegen / this.LIVES_REGEN_TIME);
      const currentLives = Math.min(Math.max(0, sanitizedLives + livesToRegenerate), this.MAX_LIVES);

      // Calculate next regeneration time
      let nextRegenTime: Date | null = null;
      let timeUntilNextRegen = 0;

      if (currentLives < this.MAX_LIVES) {
        const timeToNextRegen = this.LIVES_REGEN_TIME - (timeSinceLastRegen % this.LIVES_REGEN_TIME);
        nextRegenTime = new Date(now.getTime() + timeToNextRegen);
        timeUntilNextRegen = Math.max(0, timeToNextRegen);
      }

      return {
        currentLives,
        maxLives: this.MAX_LIVES,
        nextRegenTime,
        timeUntilNextRegen,
        canPlay: currentLives > 0
      };
    } catch (error) {
      logError(`Lives calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        currentLives: 0,
        maxLives: this.MAX_LIVES,
        nextRegenTime: null,
        timeUntilNextRegen: 0,
        canPlay: false
      };
    }
  }
  private static readonly MAX_LIVES = config.LIVES_CONFIG.MAX_LIVES;
  private static readonly LIVES_REGEN_TIME = config.LIVES_CONFIG.LIVES_REGEN_TIME * 60 * 1000; // Convert to milliseconds
  public static readonly LIVES_PER_GAME = config.LIVES_CONFIG.LIVES_PER_GAME;

  /**
   * Validate lives inputs with comprehensive checks
   */
  private static validateLivesInputs(
    lives: number,
    lastUpdate: Date,
    lastRegenTime?: Date
  ): LivesValidationResult {
    const errors: string[] = [];

    // Validate lives value
    if (typeof lives !== 'number' || isNaN(lives)) {
      errors.push('Lives must be a valid number');
    } else if (lives < 0) {
      errors.push('Lives cannot be negative');
    } else if (lives > this.MAX_LIVES * 2) { // Allow some tolerance for edge cases
      errors.push('Lives value suspiciously high');
    }

    // Validate last update date
    if (!(lastUpdate instanceof Date) || isNaN(lastUpdate.getTime())) {
      errors.push('Last update must be a valid date');
    } else if (lastUpdate > new Date()) {
      errors.push('Last update cannot be in the future');
    }

    // Validate last regen time if provided
    if (lastRegenTime) {
      if (!(lastRegenTime instanceof Date) || isNaN(lastRegenTime.getTime())) {
        errors.push('Last regen time must be a valid date');
      } else if (lastRegenTime > new Date()) {
        errors.push('Last regen time cannot be in the future');
      }
    }

    const sanitizedLives = Math.max(0, Math.min(lives, this.MAX_LIVES));

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: errors.length === 0 ? sanitizedLives : undefined
    };
  }

  // ...other methods (already migrated to lives)...

  /**
   * Anti-abuse check for suspicious lives patterns
   */
  static detectSuspiciousLivesPattern(
    livesHistory: Array<{ lives: number; timestamp: Date }>
  ): { isSuspicious: boolean; reason?: string } {
    try {
      if (!Array.isArray(livesHistory) || livesHistory.length < 2) {
        return { isSuspicious: false };
      }

      // Check for impossible lives increases
      for (let i = 1; i < livesHistory.length; i++) {
        const prev = livesHistory[i - 1];
        const curr = livesHistory[i];

        if (!prev || !curr || !prev.timestamp || !curr.timestamp) {
          continue;
        }

        const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
        const livesDiff = curr.lives - prev.lives;

        // Check for impossible lives gains
        if (livesDiff > 0) {
          const maxPossibleRegen = Math.floor(timeDiff / this.LIVES_REGEN_TIME);
          if (livesDiff > maxPossibleRegen) {
            return {
              isSuspicious: true,
              reason: 'Impossible lives regeneration detected'
            };
          }
        }

        // Check for too frequent lives updates
        if (timeDiff < 1000 && Math.abs(livesDiff) > 0) { // Less than 1 second apart
          return {
            isSuspicious: true,
            reason: 'Too frequent lives updates detected'
          };
        }
      }

      return { isSuspicious: false };
    } catch (error) {
      logError(`Suspicious pattern detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isSuspicious: false };
    }
  }
}
