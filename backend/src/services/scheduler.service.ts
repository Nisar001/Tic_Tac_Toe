import cron from 'node-cron';
import User from '../models/user.model';
import Game from '../models/game.model';
import { EnergyManager } from '../utils/energy.utils';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';

export interface JobStats {
  name: string;
  lastRun: Date | null;
  nextRun: Date | null;
  runCount: number;
  errorCount: number;
  isRunning: boolean;
  averageExecutionTime: number;
}

export class SchedulerService {
  private static energyRegenJob: cron.ScheduledTask | null = null;
  private static cleanupJob: cron.ScheduledTask | null = null;
  private static statsJob: cron.ScheduledTask | null = null;
  private static notificationJob: cron.ScheduledTask | null = null;
  private static securityJob: cron.ScheduledTask | null = null;

  private static jobStats: Map<string, JobStats> = new Map();
  private static isInitialized = false;

  static initialize(): void {
    if (this.isInitialized) {
      console.warn('Scheduler service already initialized');
      return;
    }

    try {
      this.initializeJobStats();
      this.startEnergyRegeneration();
      this.startDatabaseCleanup();
      this.startStatsCalculation();
      this.startNotificationSystem();
      this.startSecurityMonitoring();

      this.isInitialized = true;
      console.log('📅 Enhanced Scheduler service initialized with monitoring');
    } catch (error) {
      console.error('Failed to initialize scheduler service:', error);
      throw error;
    }
  }

  private static initializeJobStats(): void {
    const jobs = [
      'energyRegeneration',
      'databaseCleanup',
      'statsCalculation',
      'notifications',
      'securityMonitoring',
      'notificationSystem'
    ];

    jobs.forEach(jobName => {
      this.jobStats.set(jobName, {
        name: jobName,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        isRunning: false,
        averageExecutionTime: 0
      });
    });
  }

  private static async executeJobWithMonitoring(jobName: string, jobFunction: () => Promise<void>): Promise<void> {
    const stats = this.jobStats.get(jobName);
    if (!stats) {
      console.warn(`Job stats not initialized for: ${jobName}`);
      return;
    }

    const startTime = Date.now();
    stats.isRunning = true;

    try {
      await jobFunction();

      stats.runCount++;
      stats.lastRun = new Date();
      const executionTime = Date.now() - startTime;
      stats.averageExecutionTime = (stats.averageExecutionTime * (stats.runCount - 1) + executionTime) / stats.runCount;

    } catch (error) {
      stats.errorCount++;
      console.error(`Job ${jobName} failed:`, error);
      if (stats.errorCount > 5) {
        console.error(`ALERT: Job ${jobName} has failed ${stats.errorCount} times`);
      }
    } finally {
      stats.isRunning = false;
    }
  }

  static shutdown(): void {
    const jobs = [
      { job: this.energyRegenJob, name: 'Energy Regeneration' },
      { job: this.cleanupJob, name: 'Database Cleanup' },
      { job: this.statsJob, name: 'Stats Calculation' },
      { job: this.notificationJob, name: 'Notifications' },
      { job: this.securityJob, name: 'Security Monitoring' }
    ];

    jobs.forEach(({ job, name }) => {
      if (job) {
        job.stop();
        console.log(`Stopped ${name} job`);
      }
    });

    this.energyRegenJob = null;
    this.cleanupJob = null;
    this.statsJob = null;
    this.notificationJob = null;
    this.securityJob = null;
    this.isInitialized = false;

    console.log('📅 Enhanced Scheduler service stopped');
  }

  private static startEnergyRegeneration(): void {
    this.energyRegenJob = cron.schedule('* * * * *', async () => {
      await this.executeJobWithMonitoring('energyRegeneration', () => this.processEnergyRegeneration());
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    console.log('⚡ Energy regeneration job started');
  }

  private static startDatabaseCleanup(): void {
    this.cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.executeJobWithMonitoring('databaseCleanup', () => this.performDatabaseCleanup());
    });
    console.log('🧹 Database cleanup job started');
  }

  private static startStatsCalculation(): void {
    this.statsJob = cron.schedule('0 */6 * * *', async () => {
      await this.executeJobWithMonitoring('statsCalculation', () => this.calculateGlobalStats());
    });
    console.log('📊 Stats calculation job started');
  }

  private static startNotificationSystem(): void {
    this.notificationJob = cron.schedule('0 * * * *', async () => {
      await this.executeJobWithMonitoring('notificationSystem', () => this.processNotifications());
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    console.log('📧 Notification system job started');
  }

  private static startSecurityMonitoring(): void {
    this.securityJob = cron.schedule('*/5 * * * *', async () => {
      await this.executeJobWithMonitoring('securityMonitoring', () => this.performSecurityCheck());
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    console.log('🔒 Security monitoring job started');
  }

  private static async processEnergyRegeneration(): Promise<void> {
    const now = new Date();
    const energyConfig = EnergyManager.getEnergyConfig();

    const usersNeedingRegen = await User.find({
      energy: { $lt: energyConfig.maxEnergy },
      $or: [
        { lastEnergyRegenTime: { $exists: false } },
        { lastEnergyRegenTime: { $lte: new Date(now.getTime() - energyConfig.energyRegenTime) } }
      ]
    });

    let updatedCount = 0;
    const notificationsToSend: Array<{ userId: string; email: string; energy: number }> = [];

    for (const user of usersNeedingRegen) {
      const energyStatus = EnergyManager.calculateCurrentEnergy(user.energy, user.energyUpdatedAt, user.energyUpdatedAt);

      if (energyStatus.currentEnergy > user.energy) {
        user.energy = energyStatus.currentEnergy;
        user.energyUpdatedAt = now;
        await user.save();
        updatedCount++;

        if (user.energy < energyConfig.energyPerGame && energyStatus.currentEnergy >= energyConfig.energyPerGame) {
          notificationsToSend.push({
            userId: String(user._id),
            email: user.email,
            energy: energyStatus.currentEnergy
          });
        }
      }
    }

    // Send notifications with error handling
    try {
      await this.sendEnergyNotifications(notificationsToSend);
    } catch (error) {
      console.error('Failed to send energy notifications:', error);
    }

    if (updatedCount > 0) {
      console.log(`⚡ Regenerated energy for ${updatedCount} users`);
    }
  }

  private static async sendEnergyNotifications(notifications: Array<{ userId: string; email: string; energy: number }>): Promise<void> {
    for (const notification of notifications) {
      try {
        await EmailService.sendEmail({
          to: notification.email,
          subject: '⚡ Energy Recharged - Ready to Play!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #667eea;">🎮 Tic Tac Toe Game</h2>
              <p>Great news! Your energy has been recharged.</p>
              <p><strong>Current Energy: ${notification.energy}/5</strong></p>
              <p>You're ready to play again! Join a match now.</p>
              <a href="${process.env.FRONTEND_URL || 'https://your-default-frontend.com'}/lobby" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Play Now</a>
            </div>
          `,
          text: `Your energy has been recharged! Current Energy: ${notification.energy}/5. Ready to play again!`
        });
      } catch (error) {
        console.error(`Failed to send energy notification to ${notification.email}:`, error);
      }
    }
  }

  private static async performDatabaseCleanup(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await User.deleteMany({ isEmailVerified: false, createdAt: { $lt: sevenDaysAgo } });
    await User.updateMany({ passwordResetTokenExpiry: { $lt: new Date() } }, { $unset: { passwordResetToken: 1, passwordResetTokenExpiry: 1 } });
    await User.updateMany({ emailVerificationExpiry: { $lt: new Date() } }, { $unset: { emailVerificationToken: 1, emailVerificationExpiry: 1 } });

    console.log('🧹 Database cleanup completed');
  }

  private static async calculateGlobalStats(): Promise<void> {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

    const levelStats = await User.aggregate([
      { $match: { isEmailVerified: true } },
      { $group: { _id: null, avgLevel: { $avg: '$level' }, maxLevel: { $max: '$level' } } }
    ]);

    console.log(`📊 Global stats calculated:`, {
      totalUsers,
      activeUsers,
      verifiedUsers,
      averageLevel: levelStats[0]?.avgLevel || 0,
      maxLevel: levelStats[0]?.maxLevel || 1,
      timestamp: new Date()
    });
  }

  private static async processNotifications(): Promise<void> {
    const usersWithFullEnergy = await User.find({
      energy: { $gte: 100 },
      lastEnergyNotification: { $lt: new Date(Date.now() - 30 * 60 * 1000) }
    }).select('_id email username energy');

    for (const user of usersWithFullEnergy) {
      try {
        console.log(`Sending energy notification to user ${user.username}`);
        await User.findByIdAndUpdate(user._id, { lastEnergyNotification: new Date() });
      } catch (notificationError) {
        console.error(`Failed to send notification to user ${user._id}:`, notificationError);
      }
    }

    console.log(`Processed notifications for ${usersWithFullEnergy.length} users`);
  }

  private static async performSecurityCheck(): Promise<void> {
    const suspiciousUsers = await User.find({
      failedLoginAttempts: { $gte: 5 },
      lastFailedLogin: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });

    for (const user of suspiciousUsers) {
      console.warn(`Security alert: User ${user.username} has ${user.failedLoginAttempts} failed login attempts`);

      if ((user.failedLoginAttempts ?? 0) >= 10) {
        await User.findByIdAndUpdate(user._id, {
          isLocked: true,
          lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        console.warn(`Account locked for user ${user.username}`);
      }
    }

    const recentGames = await Game.find({
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      status: 'completed'
    }).populate('players.player1 players.player2');

    console.log('Security monitoring completed');
  }

  static async regenerateUserEnergy(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      const energyStatus = EnergyManager.calculateCurrentEnergy(user.energy, user.energyUpdatedAt, user.energyUpdatedAt);

      if (energyStatus.currentEnergy > user.energy) {
        user.energy = energyStatus.currentEnergy;
        user.energyUpdatedAt = new Date();
        await user.save();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Manual energy regeneration failed:', error);
      return false;
    }
  }

  static getStatus(): { energyRegenActive: boolean; cleanupActive: boolean; statsActive: boolean } {
    return {
      energyRegenActive: this.energyRegenJob !== null,
      cleanupActive: this.cleanupJob !== null,
      statsActive: this.statsJob !== null
    };
  }

  static async forceEnergyRegeneration(): Promise<void> {
    await this.processEnergyRegeneration();
  }

  static async forceDatabaseCleanup(): Promise<void> {
    await this.performDatabaseCleanup();
  }

  static async forceStatsCalculation(): Promise<void> {
    await this.calculateGlobalStats();
  }
}
