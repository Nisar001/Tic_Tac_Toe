import { config } from '../config';

export interface EnergyStatus {
  currentEnergy: number;
  maxEnergy: number;
  nextRegenTime: Date | null;
  timeUntilNextRegen: number; // in milliseconds
  canPlay: boolean;
}

export class EnergyManager {
  private static readonly MAX_ENERGY = config.ENERGY_CONFIG.MAX_ENERGY;
  private static readonly ENERGY_REGEN_TIME = config.ENERGY_CONFIG.ENERGY_REGEN_TIME * 60 * 1000; // Convert to milliseconds
  private static readonly ENERGY_PER_GAME = config.ENERGY_CONFIG.ENERGY_PER_GAME;

  /**
   * Calculate current energy based on last energy update
   */
  static calculateCurrentEnergy(
    lastEnergy: number,
    lastEnergyUpdate: Date,
    lastEnergyRegenTime?: Date
  ): EnergyStatus {
    const now = new Date();
    
    // If already at max energy, no need to calculate regeneration
    if (lastEnergy >= this.MAX_ENERGY) {
      return {
        currentEnergy: this.MAX_ENERGY,
        maxEnergy: this.MAX_ENERGY,
        nextRegenTime: null,
        timeUntilNextRegen: 0,
        canPlay: true
      };
    }

    // Calculate energy regeneration
    const timeSinceLastRegen = lastEnergyRegenTime 
      ? now.getTime() - lastEnergyRegenTime.getTime()
      : now.getTime() - lastEnergyUpdate.getTime();

    const energyToRegenerate = Math.floor(timeSinceLastRegen / this.ENERGY_REGEN_TIME);
    const currentEnergy = Math.min(lastEnergy + energyToRegenerate, this.MAX_ENERGY);

    // Calculate next regeneration time
    let nextRegenTime: Date | null = null;
    let timeUntilNextRegen = 0;

    if (currentEnergy < this.MAX_ENERGY) {
      const timeToNextRegen = this.ENERGY_REGEN_TIME - (timeSinceLastRegen % this.ENERGY_REGEN_TIME);
      nextRegenTime = new Date(now.getTime() + timeToNextRegen);
      timeUntilNextRegen = timeToNextRegen;
    }

    return {
      currentEnergy,
      maxEnergy: this.MAX_ENERGY,
      nextRegenTime,
      timeUntilNextRegen,
      canPlay: currentEnergy >= this.ENERGY_PER_GAME
    };
  }

  /**
   * Consume energy for a game
   */
  static consumeEnergy(currentEnergy: number): { success: boolean; newEnergy: number; error?: string } {
    if (currentEnergy < this.ENERGY_PER_GAME) {
      return {
        success: false,
        newEnergy: currentEnergy,
        error: 'Insufficient energy to play'
      };
    }

    return {
      success: true,
      newEnergy: currentEnergy - this.ENERGY_PER_GAME
    };
  }

  /**
   * Format time until next regeneration
   */
  static formatTimeUntilRegen(milliseconds: number): string {
    if (milliseconds <= 0) {
      return '0m';
    }

    const totalMinutes = Math.ceil(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get energy regeneration schedule for the next 24 hours
   */
  static getEnergySchedule(currentEnergy: number, lastEnergyRegenTime?: Date): Array<{
    time: Date;
    energy: number;
  }> {
    const schedule: Array<{ time: Date; energy: number }> = [];
    const now = new Date();
    let energy = currentEnergy;
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
    
    while (nextRegenTime <= endTime && energy < this.MAX_ENERGY) {
      energy = Math.min(energy + 1, this.MAX_ENERGY);
      schedule.push({
        time: new Date(nextRegenTime),
        energy
      });
      
      if (energy >= this.MAX_ENERGY) {
        break;
      }
      
      nextRegenTime = new Date(nextRegenTime.getTime() + this.ENERGY_REGEN_TIME);
    }

    return schedule;
  }

  /**
   * Check if user can play multiple games
   */
  static canPlayMultipleGames(currentEnergy: number, gamesCount: number): boolean {
    return currentEnergy >= (this.ENERGY_PER_GAME * gamesCount);
  }

  /**
   * Calculate max games that can be played with current energy
   */
  static getMaxPlayableGames(currentEnergy: number): number {
    return Math.floor(currentEnergy / this.ENERGY_PER_GAME);
  }

  /**
   * Get energy configuration
   */
  static getEnergyConfig() {
    return {
      maxEnergy: this.MAX_ENERGY,
      energyRegenTime: this.ENERGY_REGEN_TIME,
      energyPerGame: this.ENERGY_PER_GAME,
      energyRegenTimeMinutes: config.ENERGY_CONFIG.ENERGY_REGEN_TIME
    };
  }

  /**
   * Calculate time when user will have enough energy to play
   */
  static getTimeToPlayable(currentEnergy: number, lastEnergyRegenTime?: Date): Date | null {
    if (currentEnergy >= this.ENERGY_PER_GAME) {
      return null; // Can play now
    }

    const energyNeeded = this.ENERGY_PER_GAME - currentEnergy;
    const now = new Date();
    const baseTime = lastEnergyRegenTime || now;
    
    return new Date(baseTime.getTime() + (energyNeeded * this.ENERGY_REGEN_TIME));
  }

  /**
   * Validate energy data
   */
  static validateEnergyData(energy: number, lastUpdate: Date): boolean {
    return (
      energy >= 0 &&
      energy <= this.MAX_ENERGY &&
      lastUpdate instanceof Date &&
      lastUpdate <= new Date()
    );
  }
}
