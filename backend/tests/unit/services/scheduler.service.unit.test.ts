import cron from 'node-cron';
import { SchedulerService, JobStats } from '../../../src/services/scheduler.service';
import User from '../../../src/models/user.model';
import { EnergyManager } from '../../../src/utils/energy.utils';
import { EmailService } from '../../../src/services/email.service';
import { SMSService } from '../../../src/services/sms.service';

// Mock dependencies
jest.mock('node-cron');
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/utils/energy.utils');
jest.mock('../../../src/services/email.service');
jest.mock('../../../src/services/sms.service');

const mockCron = cron as jest.Mocked<typeof cron>;
const mockUser = User as jest.Mocked<typeof User>;
const mockEnergyManager = EnergyManager as jest.Mocked<typeof EnergyManager>;
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;

describe('SchedulerService', () => {
  let mockScheduledTask: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockScheduledTask = {
      stop: jest.fn(),
      start: jest.fn()
    };
    
    mockCron.schedule.mockReturnValue(mockScheduledTask);
    
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    jest.clearAllMocks();
    
    // Reset initialization state
    (SchedulerService as any).isInitialized = false;
  });

  afterEach(() => {
    SchedulerService.shutdown();
    consoleSpy.mockRestore();
  });

  describe('initialize', () => {
    it('should initialize all scheduled jobs successfully', () => {
      SchedulerService.initialize();

      expect(mockCron.schedule).toHaveBeenCalledTimes(5);
      expect(consoleSpy).toHaveBeenCalledWith('📅 Enhanced Scheduler service initialized with monitoring');
    });

    it('should not initialize twice', () => {
      SchedulerService.initialize();
      SchedulerService.initialize();

      expect(console.warn).toHaveBeenCalledWith('Scheduler service already initialized');
    });

    it('should handle initialization errors', () => {
      mockCron.schedule.mockImplementation(() => {
        throw new Error('Cron initialization failed');
      });

      expect(() => SchedulerService.initialize()).toThrow('Cron initialization failed');
    });
  });

  describe('shutdown', () => {
    it('should stop all scheduled jobs', () => {
      SchedulerService.initialize();
      SchedulerService.shutdown();

      expect(mockScheduledTask.stop).toHaveBeenCalledTimes(5);
      expect(consoleSpy).toHaveBeenCalledWith('📅 Enhanced Scheduler service stopped');
    });

    it('should handle shutdown when not initialized', () => {
      SchedulerService.shutdown();

      expect(mockScheduledTask.stop).not.toHaveBeenCalled();
    });
  });

  describe('job scheduling', () => {
    beforeEach(() => {
      SchedulerService.initialize();
    });

    it('should schedule energy regeneration job every minute', () => {
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '* * * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: true,
          timezone: 'UTC'
        })
      );
    });

    it('should schedule database cleanup job daily at 2 AM', () => {
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function)
      );
    });

    it('should schedule stats calculation job every 6 hours', () => {
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function)
      );
    });

    it('should schedule notification job every hour', () => {
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: true,
          timezone: 'UTC'
        })
      );
    });

    it('should schedule security monitoring job every 5 minutes', () => {
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '*/5 * * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: true,
          timezone: 'UTC'
        })
      );
    });
  });

  describe('processEnergyRegeneration', () => {
    beforeEach(() => {
      const mockEnergyConfig = {
        maxEnergy: 5,
        energyRegenTime: 60000, // 1 minute
        energyPerGame: 1,
        energyRegenTimeMinutes: 1
      };
      mockEnergyManager.getEnergyConfig.mockReturnValue(mockEnergyConfig);
    });

    it('should regenerate energy for users who need it', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          email: 'user1@example.com',
          energy: 3,
          energyUpdatedAt: new Date(Date.now() - 2 * 60000), // 2 minutes ago
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'user2',
          email: 'user2@example.com',
          energy: 1,
          energyUpdatedAt: new Date(Date.now() - 2 * 60000),
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      mockUser.find.mockResolvedValue(mockUsers);
      
      mockEnergyManager.calculateCurrentEnergy
        .mockReturnValueOnce({
          currentEnergy: 4,
          maxEnergy: 5,
          nextRegenTime: new Date(),
          timeUntilNextRegen: 0,
          canPlay: true
        })
        .mockReturnValueOnce({
          currentEnergy: 2,
          maxEnergy: 5,
          nextRegenTime: new Date(),
          timeUntilNextRegen: 0,
          canPlay: true
        });

      mockEmailService.sendEmail.mockResolvedValue(undefined);

      // Access private method through reflection
      const processEnergyRegeneration = (SchedulerService as any).processEnergyRegeneration;
      await processEnergyRegeneration();

      expect(mockUser.find).toHaveBeenCalledWith(expect.objectContaining({
        energy: { $lt: 5 }
      }));
      
      expect(mockUsers[0].save).toHaveBeenCalled();
      expect(mockUsers[1].save).toHaveBeenCalled();
      expect(mockUsers[0].energy).toBe(4);
      expect(mockUsers[1].energy).toBe(2);
    });

    it('should send notifications for users who can now play', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          email: 'user1@example.com',
          energy: 0, // Below game requirement
          energyUpdatedAt: new Date(Date.now() - 2 * 60000),
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      mockUser.find.mockResolvedValue(mockUsers);
      
      // User now has enough energy to play
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({ 
        currentEnergy: 1, // Now meets minimum requirement
        maxEnergy: 5,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });

      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const processEnergyRegeneration = (SchedulerService as any).processEnergyRegeneration;
      await processEnergyRegeneration();

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com',
          subject: '⚡ Energy Recharged - Ready to Play!',
          html: expect.stringContaining('Current Energy: 1/5')
        })
      );
    });

    it('should handle errors during energy regeneration', async () => {
      mockUser.find.mockRejectedValue(new Error('Database error'));

      const processEnergyRegeneration = (SchedulerService as any).processEnergyRegeneration;
      
      await expect(processEnergyRegeneration()).rejects.toThrow('Database error');
    });

    it('should skip users who do not need energy regeneration', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          email: 'user1@example.com',
          energy: 5, // Already at max
          energyUpdatedAt: new Date(),
          save: jest.fn()
        }
      ];

      mockUser.find.mockResolvedValue(mockUsers);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({ 
        currentEnergy: 5, // No change
        maxEnergy: 5,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });

      const processEnergyRegeneration = (SchedulerService as any).processEnergyRegeneration;
      await processEnergyRegeneration();

      expect(mockUsers[0].save).not.toHaveBeenCalled();
    });
  });

  describe('performDatabaseCleanup', () => {
    it('should clean up old unverified users', async () => {
      mockUser.deleteMany.mockResolvedValue({ deletedCount: 5, acknowledged: true });
      mockUser.updateMany.mockResolvedValue({ modifiedCount: 3, acknowledged: true, matchedCount: 3, upsertedCount: 0, upsertedId: null });

      const performDatabaseCleanup = (SchedulerService as any).performDatabaseCleanup;
      await performDatabaseCleanup();

      expect(mockUser.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          isEmailVerified: false,
          createdAt: { $lt: expect.any(Date) }
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Database cleanup completed'));
    });

    it('should clean up old password reset tokens', async () => {
      mockUser.deleteMany.mockResolvedValue({ deletedCount: 0, acknowledged: true });
      mockUser.updateMany.mockResolvedValue({ modifiedCount: 2, acknowledged: true, matchedCount: 2, upsertedCount: 0, upsertedId: null });

      const performDatabaseCleanup = (SchedulerService as any).performDatabaseCleanup;
      await performDatabaseCleanup();

      expect(mockUser.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordResetTokenExpiry: { $lt: expect.any(Date) }
        }),
        expect.objectContaining({
          $unset: expect.objectContaining({
            passwordResetToken: 1,
            passwordResetTokenExpiry: 1
          })
        })
      );
    });

    it('should handle cleanup errors', async () => {
      mockUser.deleteMany.mockRejectedValue(new Error('Database error'));

      const performDatabaseCleanup = (SchedulerService as any).performDatabaseCleanup;
      await performDatabaseCleanup();

      expect(console.error).toHaveBeenCalledWith('Database cleanup failed:', expect.any(Error));
    });
  });

  describe('calculateGlobalStats', () => {
    it('should calculate and log global statistics', async () => {
      mockUser.countDocuments
        .mockResolvedValueOnce(1000) // total users
        .mockResolvedValueOnce(250)  // active users
        .mockResolvedValueOnce(800); // verified users

      mockUser.aggregate.mockResolvedValue([
        { _id: null, avgLevel: 5.2, maxLevel: 15 }
      ]);

      const calculateGlobalStats = (SchedulerService as any).calculateGlobalStats;
      await calculateGlobalStats();

      expect(mockUser.countDocuments).toHaveBeenCalledTimes(3);
      expect(mockUser.aggregate).toHaveBeenCalledWith([
        { $match: { isEmailVerified: true } },
        { $group: { _id: null, avgLevel: { $avg: '$level' }, maxLevel: { $max: '$level' } } }
      ]);

      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 Global stats calculated:',
        expect.objectContaining({
          totalUsers: 1000,
          activeUsers: 250,
          verifiedUsers: 800,
          averageLevel: 5.2,
          maxLevel: 15
        })
      );
    });

    it('should handle missing aggregation results', async () => {
      mockUser.countDocuments.mockResolvedValue(100);
      mockUser.aggregate.mockResolvedValue([]); // No results

      const calculateGlobalStats = (SchedulerService as any).calculateGlobalStats;
      await calculateGlobalStats();

      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 Global stats calculated:',
        expect.objectContaining({
          averageLevel: 0,
          maxLevel: 1
        })
      );
    });

    it('should handle stats calculation errors', async () => {
      mockUser.countDocuments.mockRejectedValue(new Error('Database error'));

      const calculateGlobalStats = (SchedulerService as any).calculateGlobalStats;
      await calculateGlobalStats();

      expect(console.error).toHaveBeenCalledWith('Stats calculation failed:', expect.any(Error));
    });
  });

  describe('regenerateUserEnergy', () => {
    it('should regenerate energy for specific user', async () => {
      const mockUser = {
        _id: 'user1',
        energy: 2,
        energyUpdatedAt: new Date(Date.now() - 60000),
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        currentEnergy: 3,
        maxEnergy: 5,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });

      const result = await SchedulerService.regenerateUserEnergy('user1');

      expect(result).toBe(true);
      expect(User.findById).toHaveBeenCalledWith('user1');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.energy).toBe(3);
    });

    it('should return false for non-existing user', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      const result = await SchedulerService.regenerateUserEnergy('non-existing');

      expect(result).toBe(false);
    });

    it('should handle errors during user energy regeneration', async () => {
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await SchedulerService.regenerateUserEnergy('user1');

      expect(result).toBe(false);
    });
  });

  describe('job monitoring and error handling', () => {
    it('should track job statistics', async () => {
      SchedulerService.initialize();

      // Access job stats
      const jobStats = (SchedulerService as any).jobStats;
      expect(jobStats).toBeInstanceOf(Map);
      expect(jobStats.size).toBe(5);

      const energyJobStats = jobStats.get('energyRegeneration');
      expect(energyJobStats).toEqual(expect.objectContaining({
        name: 'energyRegeneration',
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        isRunning: false,
        averageExecutionTime: 0
      }));
    });

    it('should handle job execution errors', async () => {
      // Mock a job that throws an error
      const mockJobFunction = jest.fn().mockRejectedValue(new Error('Job error'));

      const executeJobWithMonitoring = (SchedulerService as any).executeJobWithMonitoring;
      await executeJobWithMonitoring('testJob', mockJobFunction);

      expect(console.error).toHaveBeenCalledWith('Job testJob failed:', expect.any(Error));
    });

    it('should update job statistics on successful execution', async () => {
      SchedulerService.initialize();
      
      const mockJobFunction = jest.fn().mockResolvedValue(undefined);
      const executeJobWithMonitoring = (SchedulerService as any).executeJobWithMonitoring;
      
      // Initialize job stats for test
      const jobStats = (SchedulerService as any).jobStats;
      jobStats.set('testJob', {
        name: 'testJob',
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        isRunning: false,
        averageExecutionTime: 0
      });

      await executeJobWithMonitoring('testJob', mockJobFunction);

      const stats = jobStats.get('testJob');
      expect(stats.runCount).toBe(1);
      expect(stats.lastRun).toBeInstanceOf(Date);
      expect(stats.isRunning).toBe(false);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('notification system', () => {
    it('should send energy notifications', async () => {
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const notifications = [
        { userId: 'user1', email: 'user1@example.com', energy: 3 },
        { userId: 'user2', email: 'user2@example.com', energy: 1 }
      ];

      const sendEnergyNotifications = (SchedulerService as any).sendEnergyNotifications;
      await sendEnergyNotifications(notifications);

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com',
          subject: '⚡ Energy Recharged - Ready to Play!',
          html: expect.stringContaining('Current Energy: 3/5')
        })
      );
    });

    it('should handle notification sending errors', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Email error'));

      const notifications = [
        { userId: 'user1', email: 'user1@example.com', energy: 3 }
      ];

      const sendEnergyNotifications = (SchedulerService as any).sendEnergyNotifications;
      await sendEnergyNotifications(notifications);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send energy notification'),
        expect.any(Error)
      );
    });
  });
});
