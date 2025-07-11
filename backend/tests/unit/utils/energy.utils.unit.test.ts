import { EnergyManager, EnergyStatus, EnergyValidationResult } from '../../../src/utils/energy.utils';
import { config } from '../../../src/config';
import * as logger from '../../../src/utils/logger';

// Mock the logger and config
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/config', () => ({
  config: {
    ENERGY_CONFIG: {
      MAX_ENERGY: 10,
      ENERGY_REGEN_TIME: 5, // 5 minutes
      ENERGY_PER_GAME: 1
    }
  }
}));

const mockLogError = logger.logError as jest.MockedFunction<typeof logger.logError>;
const mockLogDebug = logger.logDebug as jest.MockedFunction<typeof logger.logDebug>;

describe('EnergyManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCurrentEnergy', () => {
    it('should calculate energy correctly with no regeneration needed', () => {
      const lastEnergy = 10;
      const lastUpdate = new Date();
      
      const result = EnergyManager.calculateCurrentEnergy(lastEnergy, lastUpdate);
      
      expect(result.currentEnergy).toBe(10);
      expect(result.maxEnergy).toBe(10);
      expect(result.nextRegenTime).toBeNull();
      expect(result.timeUntilNextRegen).toBe(0);
      expect(result.canPlay).toBe(true);
    });

    it('should calculate energy with regeneration over time', () => {
      const lastEnergy = 5;
      const lastUpdate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      const result = EnergyManager.calculateCurrentEnergy(lastEnergy, lastUpdate);
      
      expect(result.currentEnergy).toBe(7); // 2 energy regenerated (10min / 5min = 2)
      expect(result.maxEnergy).toBe(10);
      expect(result.canPlay).toBe(true);
      expect(result.nextRegenTime).toBeInstanceOf(Date);
    });

    it('should cap energy at maximum', () => {
      const lastEnergy = 8;
      const lastUpdate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      const result = EnergyManager.calculateCurrentEnergy(lastEnergy, lastUpdate);
      
      expect(result.currentEnergy).toBe(10); // Capped at max
      expect(result.nextRegenTime).toBeNull();
      expect(result.timeUntilNextRegen).toBe(0);
    });

    it('should handle invalid energy values gracefully', () => {
      const lastEnergy = -5;
      const lastUpdate = new Date();
      
      const result = EnergyManager.calculateCurrentEnergy(lastEnergy, lastUpdate);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.currentEnergy).toBe(0);
      expect(result.canPlay).toBe(false);
    });

    it('should handle invalid date values gracefully', () => {
      const lastEnergy = 5;
      const lastUpdate = new Date('invalid');
      
      const result = EnergyManager.calculateCurrentEnergy(lastEnergy, lastUpdate);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.currentEnergy).toBe(0);
      expect(result.canPlay).toBe(false);
    });

    it('should handle future dates gracefully', () => {
      const lastEnergy = 5;
      const lastUpdate = new Date(Date.now() + 60 * 1000); // 1 minute in future
      
      const result = EnergyManager.calculateCurrentEnergy(lastEnergy, lastUpdate);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.currentEnergy).toBe(0);
    });

    it('should calculate with lastEnergyRegenTime parameter', () => {
      const lastEnergy = 5;
      const lastUpdate = new Date(Date.now() - 20 * 60 * 1000);
      const lastRegenTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      const result = EnergyManager.calculateCurrentEnergy(lastEnergy, lastUpdate, lastRegenTime);
      
      expect(result.currentEnergy).toBe(7); // Based on lastRegenTime
    });

    it('should handle exceptions during calculation', () => {
      // Mock Date to throw an error
      const originalDate = Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as any;
      
      const result = EnergyManager.calculateCurrentEnergy(5, new Date());
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.currentEnergy).toBe(0);
      
      // Restore Date
      global.Date = originalDate;
    });
  });

  describe('consumeEnergy', () => {
    it('should consume energy successfully', () => {
      const result = EnergyManager.consumeEnergy(5);
      
      expect(result.success).toBe(true);
      expect(result.newEnergy).toBe(4);
      expect(result.error).toBeUndefined();
    });

    it('should fail when insufficient energy', () => {
      const result = EnergyManager.consumeEnergy(0);
      
      expect(result.success).toBe(false);
      expect(result.newEnergy).toBe(0);
      expect(result.error).toBe('Insufficient energy to play');
    });

    it('should handle invalid energy values', () => {
      const result = EnergyManager.consumeEnergy(-1);
      
      expect(result.success).toBe(false);
      expect(result.newEnergy).toBe(-1);
      expect(result.error).toBe('Invalid energy value provided');
    });

    it('should handle NaN energy values', () => {
      const result = EnergyManager.consumeEnergy(NaN);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid energy value provided');
    });

    it('should handle extremely high energy values', () => {
      const result = EnergyManager.consumeEnergy(1000);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid energy value provided');
    });

    it('should cap energy at 0 when consuming', () => {
      const result = EnergyManager.consumeEnergy(1);
      
      expect(result.success).toBe(true);
      expect(result.newEnergy).toBe(0);
    });
  });

  describe('formatTimeUntilRegen', () => {
    it('should format minutes correctly', () => {
      const result = EnergyManager.formatTimeUntilRegen(3 * 60 * 1000); // 3 minutes
      expect(result).toBe('3m');
    });

    it('should format hours and minutes correctly', () => {
      const result = EnergyManager.formatTimeUntilRegen(90 * 60 * 1000); // 90 minutes
      expect(result).toBe('1h 30m');
    });

    it('should handle zero time', () => {
      const result = EnergyManager.formatTimeUntilRegen(0);
      expect(result).toBe('0m');
    });

    it('should handle negative time', () => {
      const result = EnergyManager.formatTimeUntilRegen(-1000);
      expect(result).toBe('0m');
    });

    it('should handle invalid input', () => {
      const result = EnergyManager.formatTimeUntilRegen(NaN);
      expect(result).toBe('0m');
    });

    it('should handle exceptions during formatting', () => {
      // Mock Math.ceil to throw an error
      const originalCeil = Math.ceil;
      Math.ceil = jest.fn(() => {
        throw new Error('Math error');
      });
      
      const result = EnergyManager.formatTimeUntilRegen(1000);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result).toBe('0m');
      
      // Restore Math.ceil
      Math.ceil = originalCeil;
    });
  });

  describe('getEnergySchedule', () => {
    it('should generate energy schedule correctly', () => {
      const currentEnergy = 5;
      const schedule = EnergyManager.getEnergySchedule(currentEnergy);
      
      expect(Array.isArray(schedule)).toBe(true);
      expect(schedule.length).toBeGreaterThan(0);
      
      if (schedule.length > 0) {
        expect(schedule[0].energy).toBe(6);
        expect(schedule[0].time).toBeInstanceOf(Date);
      }
    });

    it('should return empty schedule for invalid energy', () => {
      const schedule = EnergyManager.getEnergySchedule(-1);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(schedule).toEqual([]);
    });

    it('should return empty schedule for max energy', () => {
      const schedule = EnergyManager.getEnergySchedule(10);
      
      expect(schedule).toEqual([]);
    });

    it('should handle lastEnergyRegenTime parameter', () => {
      const currentEnergy = 5;
      const lastRegenTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      const schedule = EnergyManager.getEnergySchedule(currentEnergy, lastRegenTime);
      
      expect(Array.isArray(schedule)).toBe(true);
    });

    it('should handle exceptions during schedule generation', () => {
      // Mock Array methods to throw error
      const originalPush = Array.prototype.push;
      Array.prototype.push = jest.fn(() => {
        throw new Error('Array error');
      });
      
      const schedule = EnergyManager.getEnergySchedule(5);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(schedule).toEqual([]);
      
      // Restore Array.prototype.push
      Array.prototype.push = originalPush;
    });
  });

  describe('canPlayMultipleGames', () => {
    it('should return true for sufficient energy', () => {
      const result = EnergyManager.canPlayMultipleGames(5, 3);
      expect(result).toBe(true);
    });

    it('should return false for insufficient energy', () => {
      const result = EnergyManager.canPlayMultipleGames(2, 3);
      expect(result).toBe(false);
    });

    it('should handle invalid energy values', () => {
      const result = EnergyManager.canPlayMultipleGames(-1, 2);
      expect(result).toBe(false);
    });

    it('should handle invalid games count', () => {
      const result = EnergyManager.canPlayMultipleGames(5, -1);
      expect(result).toBe(false);
    });

    it('should handle excessive games count', () => {
      const result = EnergyManager.canPlayMultipleGames(5, 101);
      expect(result).toBe(false);
    });

    it('should handle NaN values', () => {
      const result = EnergyManager.canPlayMultipleGames(NaN, 2);
      expect(result).toBe(false);
    });
  });

  describe('getMaxPlayableGames', () => {
    it('should calculate max games correctly', () => {
      const result = EnergyManager.getMaxPlayableGames(5);
      expect(result).toBe(5);
    });

    it('should return 0 for insufficient energy', () => {
      const result = EnergyManager.getMaxPlayableGames(0);
      expect(result).toBe(0);
    });

    it('should handle invalid energy values', () => {
      const result = EnergyManager.getMaxPlayableGames(-1);
      expect(result).toBe(0);
    });

    it('should handle NaN energy values', () => {
      const result = EnergyManager.getMaxPlayableGames(NaN);
      expect(result).toBe(0);
    });

    it('should handle floating point energy', () => {
      const result = EnergyManager.getMaxPlayableGames(2.7);
      expect(result).toBe(2);
    });
  });

  describe('getEnergyConfig', () => {
    it('should return energy configuration', () => {
      const config = EnergyManager.getEnergyConfig();
      
      expect(config.maxEnergy).toBe(10);
      expect(config.energyRegenTime).toBe(5 * 60 * 1000);
      expect(config.energyPerGame).toBe(1);
      expect(config.energyRegenTimeMinutes).toBe(5);
    });

    it('should handle configuration errors gracefully', () => {
      // Mock config to throw error
      const originalConfig = require('../../../src/config').config;
      require('../../../src/config').config = {
        get ENERGY_CONFIG() {
          throw new Error('Config error');
        }
      };
      
      const config = EnergyManager.getEnergyConfig();
      
      expect(mockLogError).toHaveBeenCalled();
      expect(config.maxEnergy).toBe(10);
      expect(config.energyRegenTime).toBe(300000);
      
      // Restore config
      require('../../../src/config').config = originalConfig;
    });
  });

  describe('getTimeToPlayable', () => {
    it('should return null for sufficient energy', () => {
      const result = EnergyManager.getTimeToPlayable(5);
      expect(result).toBeNull();
    });

    it('should calculate time to playable correctly', () => {
      const result = EnergyManager.getTimeToPlayable(0);
      
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle invalid energy values', () => {
      const result = EnergyManager.getTimeToPlayable(-1);
      expect(result).toBeNull();
    });

    it('should handle lastEnergyRegenTime parameter', () => {
      const lastRegenTime = new Date();
      const result = EnergyManager.getTimeToPlayable(0, lastRegenTime);
      
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle exceptions during calculation', () => {
      // Mock Date constructor to throw error
      const originalDate = Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as any;
      
      const result = EnergyManager.getTimeToPlayable(0);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result).toBeNull();
      
      // Restore Date
      global.Date = originalDate;
    });
  });

  describe('validateEnergyData', () => {
    it('should validate correct energy data', () => {
      const result = EnergyManager.validateEnergyData(5, new Date());
      expect(result).toBe(true);
    });

    it('should reject invalid energy values', () => {
      const result = EnergyManager.validateEnergyData(-1, new Date());
      expect(result).toBe(false);
    });

    it('should reject excessive energy values', () => {
      const result = EnergyManager.validateEnergyData(15, new Date());
      expect(result).toBe(false);
    });

    it('should reject invalid dates', () => {
      const result = EnergyManager.validateEnergyData(5, new Date('invalid'));
      expect(result).toBe(false);
    });

    it('should reject future dates', () => {
      const futureDate = new Date(Date.now() + 60 * 1000);
      const result = EnergyManager.validateEnergyData(5, futureDate);
      expect(result).toBe(false);
    });

    it('should handle NaN energy', () => {
      const result = EnergyManager.validateEnergyData(NaN, new Date());
      expect(result).toBe(false);
    });

    it('should handle exceptions during validation', () => {
      // Mock instanceof to throw error
      const originalInstanceof = Date.prototype.constructor;
      Date.prototype.constructor = jest.fn(() => {
        throw new Error('Validation error');
      });
      
      const result = EnergyManager.validateEnergyData(5, new Date());
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result).toBe(false);
      
      // Restore
      Date.prototype.constructor = originalInstanceof;
    });
  });

  describe('detectSuspiciousEnergyPattern', () => {
    it('should detect no suspicious activity for normal pattern', () => {
      const history = [
        { energy: 5, timestamp: new Date(Date.now() - 20 * 60 * 1000) },
        { energy: 7, timestamp: new Date(Date.now() - 10 * 60 * 1000) },
        { energy: 8, timestamp: new Date() }
      ];
      
      const result = EnergyManager.detectSuspiciousEnergyPattern(history);
      expect(result.isSuspicious).toBe(false);
    });

    it('should detect impossible energy regeneration', () => {
      const history = [
        { energy: 5, timestamp: new Date(Date.now() - 1000) }, // 1 second ago
        { energy: 10, timestamp: new Date() } // Gained 5 energy in 1 second
      ];
      
      const result = EnergyManager.detectSuspiciousEnergyPattern(history);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toBe('Impossible energy regeneration detected');
    });

    it('should detect too frequent updates', () => {
      const history = [
        { energy: 5, timestamp: new Date(Date.now() - 500) }, // 500ms ago
        { energy: 4, timestamp: new Date() } // Energy changed in 500ms
      ];
      
      const result = EnergyManager.detectSuspiciousEnergyPattern(history);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toBe('Too frequent energy updates detected');
    });

    it('should handle empty history', () => {
      const result = EnergyManager.detectSuspiciousEnergyPattern([]);
      expect(result.isSuspicious).toBe(false);
    });

    it('should handle single entry history', () => {
      const history = [{ energy: 5, timestamp: new Date() }];
      const result = EnergyManager.detectSuspiciousEnergyPattern(history);
      expect(result.isSuspicious).toBe(false);
    });

    it('should handle invalid history entries', () => {
      const history = [
        { energy: 5, timestamp: new Date() },
        null as any,
        { energy: 6, timestamp: new Date() }
      ];
      
      const result = EnergyManager.detectSuspiciousEnergyPattern(history);
      expect(result.isSuspicious).toBe(false);
    });

    it('should handle exceptions during pattern detection', () => {
      const history = [
        { energy: 5, timestamp: new Date() },
        { energy: 6, timestamp: new Date() }
      ];
      
      // Mock getTime to throw error
      const originalGetTime = Date.prototype.getTime;
      Date.prototype.getTime = jest.fn(() => {
        throw new Error('Time error');
      });
      
      const result = EnergyManager.detectSuspiciousEnergyPattern(history);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.isSuspicious).toBe(false);
      
      // Restore getTime
      Date.prototype.getTime = originalGetTime;
    });
  });
});
