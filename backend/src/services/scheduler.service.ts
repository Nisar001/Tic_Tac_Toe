import cron from 'node-cron';
import User from '../models/user.model';
import { EnergyManager } from '../utils/energy.utils';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';

export class SchedulerService {
  private static energyRegenJob: cron.ScheduledTask | null = null;
  private static cleanupJob: cron.ScheduledTask | null = null;
  private static statsJob: cron.ScheduledTask | null = null;

  /**
   * Initialize all scheduled jobs
   */
  static initialize(): void {
    this.startEnergyRegeneration();
    this.startDatabaseCleanup();
    this.startStatsCalculation();
    console.log('📅 Scheduler service initialized');
  }

  /**
   * Stop all scheduled jobs
   */
  static shutdown(): void {
    if (this.energyRegenJob) {
      this.energyRegenJob.stop();
      this.energyRegenJob = null;
    }
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob = null;
    }
    if (this.statsJob) {
      this.statsJob.stop();
      this.statsJob = null;
    }
    console.log('📅 Scheduler service stopped');
  }

  /**
   * Energy regeneration job - runs every minute
   */
  private static startEnergyRegeneration(): void {
    this.energyRegenJob = cron.schedule('* * * * *', async () => {
      try {
        await this.processEnergyRegeneration();
      } catch (error) {
        console.error('Energy regeneration job failed:', error);
      }
    });
    console.log('⚡ Energy regeneration job started');
  }

  /**
   * Database cleanup job - runs daily at 2 AM
   */
  private static startDatabaseCleanup(): void {
    this.cleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        await this.performDatabaseCleanup();
      } catch (error) {
        console.error('Database cleanup job failed:', error);
      }
    });
    console.log('🧹 Database cleanup job started');
  }

  /**
   * Stats calculation job - runs every 6 hours
   */
  private static startStatsCalculation(): void {
    this.statsJob = cron.schedule('0 */6 * * *', async () => {
      try {
        await this.calculateGlobalStats();
      } catch (error) {
        console.error('Stats calculation job failed:', error);
      }
    });
    console.log('📊 Stats calculation job started');
  }

  /**
   * Process energy regeneration for all users
   */
  private static async processEnergyRegeneration(): Promise<void> {
    const now = new Date();
    const energyConfig = EnergyManager.getEnergyConfig();

    // Find users who need energy regeneration
    const usersNeedingRegen = await User.find({
      energy: { $lt: energyConfig.maxEnergy },
      $or: [
        { lastEnergyRegenTime: { $exists: false } },
        { 
          lastEnergyRegenTime: { 
            $lte: new Date(now.getTime() - energyConfig.energyRegenTime)
          }
        }
      ]
    });

    let updatedCount = 0;
    const notificationsToSend: Array<{ userId: string; email: string; energy: number }> = [];

    for (const user of usersNeedingRegen) {
      const energyStatus = EnergyManager.calculateCurrentEnergy(
        user.energy,
        user.energyUpdatedAt,
        user.energyUpdatedAt
      );

      if (energyStatus.currentEnergy > user.energy) {
        // Update user's energy
        user.energy = energyStatus.currentEnergy;
        user.energyUpdatedAt = now;
        user.energyUpdatedAt = now;
        await user.save();

        updatedCount++;

        // Queue notification if user now has enough energy to play and was previously unable
        if (user.energy < energyConfig.energyPerGame && energyStatus.currentEnergy >= energyConfig.energyPerGame) {
          notificationsToSend.push({
            userId: (user._id as string).toString(),
            email: user.email,
            energy: energyStatus.currentEnergy
          });
        }
      }
    }

    // Send notifications
    await this.sendEnergyNotifications(notificationsToSend);

    if (updatedCount > 0) {
      console.log(`⚡ Regenerated energy for ${updatedCount} users`);
    }
  }

  /**
   * Send energy regeneration notifications
   */
  private static async sendEnergyNotifications(
    notifications: Array<{ userId: string; email: string; energy: number }>
  ): Promise<void> {
    for (const notification of notifications) {
      try {
        // Send email notification
        await EmailService.sendEmail({
          to: notification.email,
          subject: '⚡ Energy Recharged - Ready to Play!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #667eea;">🎮 Tic Tac Toe Game</h2>
              <p>Great news! Your energy has been recharged.</p>
              <p><strong>Current Energy: ${notification.energy}/5</strong></p>
              <p>You're ready to play again! Join a match now.</p>
              <a href="${process.env.FRONTEND_URL}/lobby" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Play Now</a>
            </div>
          `,
          text: `Your energy has been recharged! Current Energy: ${notification.energy}/5. Ready to play again!`
        });
      } catch (error) {
        console.error(`Failed to send energy notification to ${notification.email}:`, error);
      }
    }
  }

  /**
   * Perform database cleanup
   */
  private static async performDatabaseCleanup(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Clean up old unverified users
      const unverifiedUsersDeleted = await User.deleteMany({
        isEmailVerified: false,
        createdAt: { $lt: sevenDaysAgo }
      });

      // Clean up old password reset tokens
      const passwordResetCleaned = await User.updateMany(
        {
          passwordResetTokenExpiry: { $lt: new Date() }
        },
        {
          $unset: {
            passwordResetToken: 1,
            passwordResetTokenExpiry: 1
          }
        }
      );

      // Clean up old verification tokens
      const verificationCleaned = await User.updateMany(
        {
          emailVerificationExpiry: { $lt: new Date() }
        },
        {
          $unset: {
            emailVerificationToken: 1,
            emailVerificationExpiry: 1
          }
        }
      );

      console.log(`🧹 Database cleanup completed:
        - Deleted ${unverifiedUsersDeleted.deletedCount} unverified users
        - Cleaned ${passwordResetCleaned.modifiedCount} password reset tokens
        - Cleaned ${verificationCleaned.modifiedCount} verification tokens`);

    } catch (error) {
      console.error('Database cleanup failed:', error);
    }
  }

  /**
   * Calculate global statistics
   */
  private static async calculateGlobalStats(): Promise<void> {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

      // Calculate average level
      const levelStats = await User.aggregate([
        { $match: { isEmailVerified: true } },
        { $group: { _id: null, avgLevel: { $avg: '$level' }, maxLevel: { $max: '$level' } } }
      ]);

      const stats = {
        totalUsers,
        activeUsers,
        verifiedUsers,
        averageLevel: levelStats[0]?.avgLevel || 0,
        maxLevel: levelStats[0]?.maxLevel || 1,
        timestamp: new Date()
      };

      console.log(`📊 Global stats calculated:`, stats);

      // Store stats in database or cache if needed
      // await GlobalStats.create(stats);

    } catch (error) {
      console.error('Stats calculation failed:', error);
    }
  }

  /**
   * Manual energy regeneration for specific user
   */
  static async regenerateUserEnergy(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      const energyStatus = EnergyManager.calculateCurrentEnergy(
        user.energy,
        user.energyUpdatedAt,
        user.energyUpdatedAt
      );

      if (energyStatus.currentEnergy > user.energy) {
        user.energy = energyStatus.currentEnergy;
        user.energyUpdatedAt = new Date();
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

  /**
   * Get scheduler status
   */
  static getStatus(): {
    energyRegenActive: boolean;
    cleanupActive: boolean;
    statsActive: boolean;
  } {
    return {
      energyRegenActive: this.energyRegenJob !== null,
      cleanupActive: this.cleanupJob !== null,
      statsActive: this.statsJob !== null
    };
  }

  /**
   * Force run energy regeneration
   */
  static async forceEnergyRegeneration(): Promise<void> {
    await this.processEnergyRegeneration();
  }

  /**
   * Force run database cleanup
   */
  static async forceDatabaseCleanup(): Promise<void> {
    await this.performDatabaseCleanup();
  }

  /**
   * Force run stats calculation
   */
  static async forceStatsCalculation(): Promise<void> {
    await this.calculateGlobalStats();
  }
}
