import cron from 'node-cron';
import User from '../models/user.model';
import Game from '../models/game.model';
import { LivesManager } from '../utils/lives.utils';
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
  private static livesRegenJob: any = null;
  private static cleanupJob: any = null;
  private static statsJob: any = null;
  private static notificationJob: any = null;
  private static securityJob: any = null;

  private static jobStats: Map<string, JobStats> = new Map();
  private static isInitialized = false;

  static initialize(): void {
    if (this.isInitialized) {

      return;
    }

    try {
      this.initializeJobStats();
      this.startLivesRegeneration();
      this.startDatabaseCleanup();
      this.startStatsCalculation();
      this.startNotificationSystem();
      this.startSecurityMonitoring();

      this.isInitialized = true;

    } catch (error) {

      throw error;
    }
  }

  private static initializeJobStats(): void {
    const jobs = [
      'livesRegeneration',
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

      if (stats.errorCount > 5) {

      }
    } finally {
      stats.isRunning = false;
    }
  }

  static shutdown(): void {
    const jobs = [
      { job: this.livesRegenJob, name: 'Lives Regeneration' },
      { job: this.cleanupJob, name: 'Database Cleanup' },
      { job: this.statsJob, name: 'Stats Calculation' },
      { job: this.notificationJob, name: 'Notifications' },
      { job: this.securityJob, name: 'Security Monitoring' }
    ];

    jobs.forEach(({ job, name }) => {
      if (job) {
        job.stop();

      }
    });

    this.livesRegenJob = null;
    this.cleanupJob = null;
    this.statsJob = null;
    this.notificationJob = null;
    this.securityJob = null;
    this.isInitialized = false;


  }

  private static startLivesRegeneration(): void {
    this.livesRegenJob = cron.schedule('* * * * *', async () => {
      await this.executeJobWithMonitoring('livesRegeneration', () => this.processLivesRegeneration());
    }, {
      scheduled: true,
      timezone: "UTC"
    });

  }

  private static startDatabaseCleanup(): void {
    this.cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.executeJobWithMonitoring('databaseCleanup', () => this.performDatabaseCleanup());
    });

  }

  private static startStatsCalculation(): void {
    this.statsJob = cron.schedule('0 */6 * * *', async () => {
      await this.executeJobWithMonitoring('statsCalculation', () => this.calculateGlobalStats());
    });

  }

  private static startNotificationSystem(): void {
    this.notificationJob = cron.schedule('0 * * * *', async () => {
      await this.executeJobWithMonitoring('notificationSystem', () => this.processNotifications());
    }, {
      scheduled: true,
      timezone: "UTC"
    });

  }

  private static startSecurityMonitoring(): void {
    this.securityJob = cron.schedule('*/5 * * * *', async () => {
      await this.executeJobWithMonitoring('securityMonitoring', () => this.performSecurityCheck());
    }, {
      scheduled: true,
      timezone: "UTC"
    });

  }

  private static async processLivesRegeneration(): Promise<void> {
    const now = new Date();
    const maxLives = 5;
    const livesRegenInterval = 30 * 60 * 1000; // 30 minutes

    const usersNeedingRegen = await User.find({
      lives: { $lt: maxLives },
      $or: [
        { lastLivesRegenTime: { $exists: false } },
        { lastLivesRegenTime: { $lte: new Date(now.getTime() - livesRegenInterval) } }
      ]
    });

    let updatedCount = 0;
    const notificationsToSend: Array<{ userId: string; email: string; lives: number }> = [];

    for (const user of usersNeedingRegen) {
      const livesStatus = LivesManager.calculateCurrentLives(user.lives, user.lastLivesUpdate, user.lastLivesRegenTime);

      if (livesStatus.currentLives > user.lives) {
        user.lives = livesStatus.currentLives;
        user.lastLivesUpdate = now;
        await user.save();
        updatedCount++;

        if (user.lives < 1 && livesStatus.currentLives >= 1) {
          notificationsToSend.push({
            userId: String(user._id),
            email: user.email,
            lives: livesStatus.currentLives
          });
        }
      }
    }

    // Send notifications with error handling
    try {
      await this.sendLivesNotifications(notificationsToSend);
    } catch (error) {

    }

    if (updatedCount > 0) {

    }
  }

  private static async sendLivesNotifications(notifications: Array<{ userId: string; email: string; lives: number }>): Promise<void> {
    for (const notification of notifications) {
      try {
        await EmailService.sendEmail({
          to: notification.email,
          subject: '❤️ Lives Recharged - Ready to Play!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #667eea;">🎮 Tic Tac Toe Game</h2>
              <p>Great news! Your lives have been recharged.</p>
              <p><strong>Current Lives: ${notification.lives}/5</strong></p>
              <p>You're ready to play again! Join a match now.</p>
              <a href="${process.env.FRONTEND_URL || 'https://your-default-frontend.com'}/lobby" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Play Now</a>
            </div>
          `,
          text: `Your lives have been recharged! Current Lives: ${notification.lives}/5. Ready to play again!`
        });
      } catch (error) {

      }
    }
  }

  private static async performDatabaseCleanup(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await User.deleteMany({ isEmailVerified: false, createdAt: { $lt: sevenDaysAgo } });
    await User.updateMany({ passwordResetTokenExpiry: { $lt: new Date() } }, { $unset: { passwordResetToken: 1, passwordResetTokenExpiry: 1 } });
    await User.updateMany({ emailVerificationExpiry: { $lt: new Date() } }, { $unset: { emailVerificationToken: 1, emailVerificationExpiry: 1 } });


  }

  private static async calculateGlobalStats(): Promise<void> {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

    const levelStats = await User.aggregate([
      { $match: { isEmailVerified: true } },
      { $group: { _id: null, avgLevel: { $avg: '$level' }, maxLevel: { $max: '$level' } } }
    ]);

    // Global stats calculated successfully
  }

  private static async processNotifications(): Promise<void> {
    const usersWithFullLives = await User.find({
      lives: { $gte: 5 },
      lastLivesNotification: { $lt: new Date(Date.now() - 30 * 60 * 1000) }
    }).select('_id email username lives');

    for (const user of usersWithFullLives) {
      try {

        await User.findByIdAndUpdate(user._id, { lastLivesNotification: new Date() });
      } catch (notificationError) {

      }
    }


  }

  private static async performSecurityCheck(): Promise<void> {
    const suspiciousUsers = await User.find({
      failedLoginAttempts: { $gte: 5 },
      lastFailedLogin: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });

    for (const user of suspiciousUsers) {


      if ((user.failedLoginAttempts ?? 0) >= 10) {
        await User.findByIdAndUpdate(user._id, {
          isLocked: true,
          lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

      }
    }

    const recentGames = await Game.find({
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      status: 'completed'
    }).populate('players.player1 players.player2');


  }

  static async regenerateUserLives(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      const livesStatus = LivesManager.calculateCurrentLives(user.lives, user.lastLivesUpdate, user.lastLivesRegenTime);

      if (livesStatus.currentLives > user.lives) {
        user.lives = livesStatus.currentLives;
        user.lastLivesUpdate = new Date();
        await user.save();
        return true;
      }

      return false;
    } catch (error) {

      return false;
    }
  }

  static getStatus(): { livesRegenActive: boolean; cleanupActive: boolean; statsActive: boolean } {
    return {
      livesRegenActive: this.livesRegenJob !== null,
      cleanupActive: this.cleanupJob !== null,
      statsActive: this.statsJob !== null
    };
  }

  static async forceLivesRegeneration(): Promise<void> {
    await this.processLivesRegeneration();
  }

  static async forceDatabaseCleanup(): Promise<void> {
    await this.performDatabaseCleanup();
  }

  static async forceStatsCalculation(): Promise<void> {
    await this.calculateGlobalStats();
  }
}
