import { config } from '../config';
import { logError, logDebug } from './logger';

export interface EnergyStatus {
  currentEnergy: number;
  maxEnergy: number;
  nextRegenTime: Date | null;
  timeUntilNextRegen: number; // in milliseconds
  canPlay: boolean;
}

export interface EnergyValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: number;
}

export class EnergyManager {
  private static readonly MAX_ENERGY = config.ENERGY_CONFIG.MAX_ENERGY;
  private static readonly ENERGY_REGEN_TIME = config.ENERGY_CONFIG.ENERGY_REGEN_TIME * 60 * 1000; // Convert to milliseconds
  private static readonly ENERGY_PER_GAME = config.ENERGY_CONFIG.ENERGY_PER_GAME;

  /**
   * Validate energy inputs with comprehensive checks
   */
  private static validateEnergyInputs(
    energy: number,
    lastUpdate: Date,
    lastRegenTime?: Date
  ): EnergyValidationResult {
    const errors: string[] = [];

    // Validate energy value
    if (typeof energy !== 'number' || isNaN(energy)) {
      errors.push('Energy must be a valid number');
    } else if (energy < 0) {
      errors.push('Energy cannot be negative');
    } else if (energy > this.MAX_ENERGY * 2) { // Allow some tolerance for edge cases
      errors.push('Energy value suspiciously high');
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

    const sanitizedEnergy = Math.max(0, Math.min(energy, this.MAX_ENERGY));

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: errors.length === 0 ? sanitizedEnergy : undefined
    };
  }

  /**
   * Check if energy value is valid
   */
  private static isValidEnergyValue(energy: number): boolean {
    return typeof energy === 'number' && 
           !isNaN(energy) && 
           energy >= 0 && 
           energy <= this.MAX_ENERGY * 2;
  }

  /**
   * Get default energy status for error cases
   */
  private static getDefaultEnergyStatus(): EnergyStatus {
    return {
      currentEnergy: 0,
      maxEnergy: this.MAX_ENERGY,
      nextRegenTime: new Date(Date.now() + this.ENERGY_REGEN_TIME),
      timeUntilNextRegen: this.ENERGY_REGEN_TIME,
      canPlay: false
    };
  }

  /**
   * Calculate current energy based on last energy update
   * Enhanced with robust validation and error handling
   */
  static calculateCurrentEnergy(
    lastEnergy: number,
    lastEnergyUpdate: Date,
    lastEnergyRegenTime?: Date
  ): EnergyStatus {
    try {
      // Input validation
      const validation = this.validateEnergyInputs(lastEnergy, lastEnergyUpdate, lastEnergyRegenTime);
      if (!validation.isValid) {
        logError(`Energy calculation failed: ${validation.errors.join(', ')}`);
        return this.getDefaultEnergyStatus();
      }

      const now = new Date();
      const sanitizedEnergy = validation.sanitizedValue!;
      
      // If already at max energy, no need to calculate regeneration
      if (sanitizedEnergy >= this.MAX_ENERGY) {
        return {
          currentEnergy: this.MAX_ENERGY,
          maxEnergy: this.MAX_ENERGY,
          nextRegenTime: null,
          timeUntilNextRegen: 0,
          canPlay: true
        };
      }

      // Calculate energy regeneration with safeguards
      const timeSinceLastRegen = lastEnergyRegenTime 
        ? Math.max(0, now.getTime() - lastEnergyRegenTime.getTime())
        : Math.max(0, now.getTime() - lastEnergyUpdate.getTime());

      const energyToRegenerate = Math.floor(timeSinceLastRegen / this.ENERGY_REGEN_TIME);
      const currentEnergy = Math.min(Math.max(0, sanitizedEnergy + energyToRegenerate), this.MAX_ENERGY);

      // Calculate next regeneration time
      let nextRegenTime: Date | null = null;
      let timeUntilNextRegen = 0;

      if (currentEnergy < this.MAX_ENERGY) {
        const timeToNextRegen = this.ENERGY_REGEN_TIME - (timeSinceLastRegen % this.ENERGY_REGEN_TIME);
        nextRegenTime = new Date(now.getTime() + timeToNextRegen);
        timeUntilNextRegen = Math.max(0, timeToNextRegen);
      }

      return {
        currentEnergy,
        maxEnergy: this.MAX_ENERGY,
        nextRegenTime,
        timeUntilNextRegen,
        canPlay: currentEnergy >= this.ENERGY_PER_GAME
      };
    } catch (error) {
      logError(`Energy calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.getDefaultEnergyStatus();
    }
  }

  /**
   * Consume energy for a game with enhanced validation
   */
  static consumeEnergy(currentEnergy: number): { success: boolean; newEnergy: number; error?: string } {
    try {
      // Input validation
      if (!this.isValidEnergyValue(currentEnergy)) {
        return {
          success: false,
          newEnergy: currentEnergy,
          error: 'Invalid energy value provided'
        };
      }

      if (currentEnergy < this.ENERGY_PER_GAME) {
        return {
          success: false,
          newEnergy: currentEnergy,
          error: 'Insufficient energy to play'
        };
      }

      const newEnergy = Math.max(0, currentEnergy - this.ENERGY_PER_GAME);
      
      return {
        success: true,
        newEnergy
      };
    } catch (error) {
      logError(`Energy consumption error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        newEnergy: currentEnergy,
        error: 'Energy consumption failed'
      };
    }
  }

  /**
   * Format time until next regeneration with enhanced safety
   */
  static formatTimeUntilRegen(milliseconds: number): string {
    try {
      if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds <= 0) {
        return '0m';
      }

      const totalMinutes = Math.ceil(Math.max(0, milliseconds) / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    } catch (error) {
      logError(`Time formatting error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return '0m';
    }
  }

  /**
   * Get energy regeneration schedule for the next 24 hours with validation
   */
  static getEnergySchedule(currentEnergy: number, lastEnergyRegenTime?: Date): Array<{
    time: Date;
    energy: number;
  }> {
    try {
      if (!this.isValidEnergyValue(currentEnergy)) {
        logError('Invalid energy value for schedule calculation');
        return [];
      }

      const schedule: Array<{ time: Date; energy: number }> = [];
      const now = new Date();
      let energy = Math.max(0, Math.min(currentEnergy, this.MAX_ENERGY));
      let nextRegenTime = lastEnergyRegenTime ? new Date(lastEnergyRegenTime.getTime() + this.ENERGY_REGEN_TIME) : now;

      // If we're past the next regen time, calculate the actual next regen time
      if (nextRegenTime <= now && energy < this.MAX_ENERGY) {
        const timePassed = now.getTime() - nextRegenTime.getTime();
        const regenCycles = Math.floor(timePassed / this.ENERGY_REGEN_TIME);
        energy = Math.min(energy + regenCycles, this.MAX_ENERGY);
        nextRegenTime = new Date(nextRegenTime.getTime() + (regenCycles + 1) * this.ENERGY_REGEN_TIME);
      }

      // Generate schedule for next 24 hours
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      let iterations = 0;
      const maxIterations = Math.ceil(24 * 60 / (this.ENERGY_REGEN_TIME / (60 * 1000))); // Safety limit
      
      while (nextRegenTime <= endTime && energy < this.MAX_ENERGY && iterations < maxIterations) {
        energy = Math.min(energy + 1, this.MAX_ENERGY);
        schedule.push({
          time: new Date(nextRegenTime),
          energy
        });
        
        if (energy >= this.MAX_ENERGY) {
          break;
        }
        
        nextRegenTime = new Date(nextRegenTime.getTime() + this.ENERGY_REGEN_TIME);
        iterations++;
      }

      return schedule;
    } catch (error) {
      logError(`Energy schedule calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Check if user can play multiple games with validation
   */
  static canPlayMultipleGames(currentEnergy: number, gamesCount: number): boolean {
    try {
      if (!this.isValidEnergyValue(currentEnergy)) {
        return false;
      }

      if (typeof gamesCount !== 'number' || isNaN(gamesCount) || gamesCount < 0 || gamesCount > 100) {
        return false;
      }

      return currentEnergy >= (this.ENERGY_PER_GAME * gamesCount);
    } catch (error) {
      logError(`Multiple games check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Calculate max games that can be played with current energy
   */
  static getMaxPlayableGames(currentEnergy: number): number {
    try {
      if (!this.isValidEnergyValue(currentEnergy)) {
        return 0;
      }

      return Math.floor(Math.max(0, currentEnergy) / this.ENERGY_PER_GAME);
    } catch (error) {
      logError(`Max playable games calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Get energy configuration with validation
   */
  static getEnergyConfig() {
    try {
      return {
        maxEnergy: this.MAX_ENERGY,
        energyRegenTime: this.ENERGY_REGEN_TIME,
        energyPerGame: this.ENERGY_PER_GAME,
        energyRegenTimeMinutes: config.ENERGY_CONFIG.ENERGY_REGEN_TIME
      };
    } catch (error) {
      logError(`Energy config retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        maxEnergy: 10,
        energyRegenTime: 300000,
        energyPerGame: 1,
        energyRegenTimeMinutes: 5
      };
    }
  }

  /**
   * Calculate time when user will have enough energy to play
   */
  static getTimeToPlayable(currentEnergy: number, lastEnergyRegenTime?: Date): Date | null {
    try {
      if (!this.isValidEnergyValue(currentEnergy)) {
        return null;
      }

      if (currentEnergy >= this.ENERGY_PER_GAME) {
        return null; // Can play now
      }

      const energyNeeded = this.ENERGY_PER_GAME - currentEnergy;
      const now = new Date();
      const baseTime = lastEnergyRegenTime || now;
      
      return new Date(baseTime.getTime() + (energyNeeded * this.ENERGY_REGEN_TIME));
    } catch (error) {
      logError(`Time to playable calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Validate energy data with enhanced checks
   */
  static validateEnergyData(energy: number, lastUpdate: Date): boolean {
    try {
      return (
        typeof energy === 'number' &&
        !isNaN(energy) &&
        energy >= 0 &&
        energy <= this.MAX_ENERGY &&
        lastUpdate instanceof Date &&
        !isNaN(lastUpdate.getTime()) &&
        lastUpdate <= new Date()
      );
    } catch (error) {
      logError(`Energy data validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Anti-abuse check for suspicious energy patterns
   */
  static detectSuspiciousEnergyPattern(
    energyHistory: Array<{ energy: number; timestamp: Date }>
  ): { isSuspicious: boolean; reason?: string } {
    try {
      if (!Array.isArray(energyHistory) || energyHistory.length < 2) {
        return { isSuspicious: false };
      }

      // Check for impossible energy increases
      for (let i = 1; i < energyHistory.length; i++) {
        const prev = energyHistory[i - 1];
        const curr = energyHistory[i];

        if (!prev || !curr || !prev.timestamp || !curr.timestamp) {
          continue;
        }

        const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
        const energyDiff = curr.energy - prev.energy;

        // Check for impossible energy gains
        if (energyDiff > 0) {
          const maxPossibleRegen = Math.floor(timeDiff / this.ENERGY_REGEN_TIME);
          if (energyDiff > maxPossibleRegen) {
            return {
              isSuspicious: true,
              reason: 'Impossible energy regeneration detected'
            };
          }
        }

        // Check for too frequent energy updates
        if (timeDiff < 1000 && Math.abs(energyDiff) > 0) { // Less than 1 second apart
          return {
            isSuspicious: true,
            reason: 'Too frequent energy updates detected'
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
