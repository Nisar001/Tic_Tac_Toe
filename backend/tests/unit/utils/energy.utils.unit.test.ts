// Unit tests for energy.utils.ts
import { EnergyManager, EnergyStatus } from '../../../src/utils/energy.utils';
import { config } from '../../../src/config';

describe('EnergyManager', () => {
  describe('calculateCurrentEnergy', () => {
    it('should calculate current energy correctly when at max energy', () => {
      const result = EnergyManager.calculateCurrentEnergy(config.ENERGY_CONFIG.MAX_ENERGY, new Date());
      expect(result).toEqual({
        currentEnergy: config.ENERGY_CONFIG.MAX_ENERGY,
        maxEnergy: config.ENERGY_CONFIG.MAX_ENERGY,
        nextRegenTime: null,
        timeUntilNextRegen: 0,
        canPlay: true
      });
    });

    it('should calculate current energy with regeneration', () => {
      const lastEnergy = 5;
      const lastEnergyUpdate = new Date(Date.now() - config.ENERGY_CONFIG.ENERGY_REGEN_TIME * 60 * 1000 * 3);
      const result = EnergyManager.calculateCurrentEnergy(lastEnergy, lastEnergyUpdate);
      expect(result.currentEnergy).toBeGreaterThan(lastEnergy);
    });
  });

  describe('consumeEnergy', () => {
    it('should consume energy for a game', () => {
      const result = EnergyManager.consumeEnergy(config.ENERGY_CONFIG.ENERGY_PER_GAME + 1);
      expect(result).toEqual({
        success: true,
        newEnergy: 1
      });
    });

    it('should return an error for insufficient energy', () => {
      const result = EnergyManager.consumeEnergy(config.ENERGY_CONFIG.ENERGY_PER_GAME - 1);
      expect(result).toEqual({
        success: false,
        newEnergy: config.ENERGY_CONFIG.ENERGY_PER_GAME - 1,
        error: 'Insufficient energy to play'
      });
    });
  });

  describe('formatTimeUntilRegen', () => {
    it('should format time correctly', () => {
      expect(EnergyManager.formatTimeUntilRegen(3600000)).toBe('1h 0m');
      expect(EnergyManager.formatTimeUntilRegen(60000)).toBe('1m');
    });
  });

  describe('getEnergySchedule', () => {
    it('should generate energy schedule for the next 24 hours', () => {
      const schedule = EnergyManager.getEnergySchedule(0);
      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0].energy).toBeGreaterThan(0);
    });
  });

  describe('canPlayMultipleGames', () => {
    it('should return true if user can play multiple games', () => {
      expect(EnergyManager.canPlayMultipleGames(config.ENERGY_CONFIG.ENERGY_PER_GAME * 3, 3)).toBe(true);
    });

    it('should return false if user cannot play multiple games', () => {
      expect(EnergyManager.canPlayMultipleGames(config.ENERGY_CONFIG.ENERGY_PER_GAME * 2, 3)).toBe(false);
    });
  });

  describe('getMaxPlayableGames', () => {
    it('should calculate max playable games correctly', () => {
      expect(EnergyManager.getMaxPlayableGames(config.ENERGY_CONFIG.ENERGY_PER_GAME * 3)).toBe(3);
    });
  });

  describe('getEnergyConfig', () => {
    it('should return energy configuration', () => {
      const configData = EnergyManager.getEnergyConfig();
      expect(configData).toEqual({
        maxEnergy: config.ENERGY_CONFIG.MAX_ENERGY,
        energyRegenTime: config.ENERGY_CONFIG.ENERGY_REGEN_TIME * 60 * 1000,
        energyPerGame: config.ENERGY_CONFIG.ENERGY_PER_GAME,
        energyRegenTimeMinutes: config.ENERGY_CONFIG.ENERGY_REGEN_TIME
      });
    });
  });

  describe('getTimeToPlayable', () => {
    it('should calculate time to playable correctly', () => {
      const result = EnergyManager.getTimeToPlayable(0);
      expect(result).toBeInstanceOf(Date);
    });

    it('should return null if user can play now', () => {
      const result = EnergyManager.getTimeToPlayable(config.ENERGY_CONFIG.ENERGY_PER_GAME);
      expect(result).toBeNull();
    });
  });

  describe('validateEnergyData', () => {
    it('should validate energy data correctly', () => {
      expect(EnergyManager.validateEnergyData(5, new Date())).toBe(true);
      expect(EnergyManager.validateEnergyData(-1, new Date())).toBe(false);
    });
  });
});
