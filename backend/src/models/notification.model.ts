import mongoose, { Document, Schema, Model } from 'mongoose';
import { logError } from '../utils/logger';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: 'game_invite' | 'friend_request' | 'game_result' | 'system' | 'achievement';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  markAsRead(): void;
  isExpired(): boolean;
}

export interface INotificationModel extends Model<INotification> {
  createNotification(
    recipient: mongoose.Types.ObjectId,
    type: INotification['type'],
    title: string,
    message: string,
    data?: any
  ): Promise<INotification>;
  getUnreadCount(userId: mongoose.Types.ObjectId): Promise<number>;
  markAllAsRead(userId: mongoose.Types.ObjectId): Promise<void>;
  cleanupExpiredNotifications(): Promise<number>;
}

const NotificationSchema = new Schema<INotification>({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['game_invite', 'friend_request', 'game_result', 'system', 'achievement'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters'],
    trim: true
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

// Instance methods
NotificationSchema.methods.markAsRead = function(): void {
  this.isRead = true;
};

NotificationSchema.methods.isExpired = function(): boolean {
  return this.expiresAt ? this.expiresAt < new Date() : false;
};

// Static methods
NotificationSchema.statics.createNotification = async function(
  recipient: mongoose.Types.ObjectId,
  type: INotification['type'],
  title: string,
  message: string,
  data?: any
): Promise<INotification> {
  try {
    const notification = new this({
      recipient,
      type,
      title,
      message,
      data: data || {}
    });

    await notification.save();
    return notification;
  } catch (error) {
    logError(`Error creating notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

NotificationSchema.statics.getUnreadCount = async function(
  userId: mongoose.Types.ObjectId
): Promise<number> {
  try {
    return await this.countDocuments({
      recipient: userId,
      isRead: false
    });
  } catch (error) {
    logError(`Error getting unread count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 0;
  }
};

NotificationSchema.statics.markAllAsRead = async function(
  userId: mongoose.Types.ObjectId
): Promise<void> {
  try {
    await this.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, updatedAt: new Date() }
    );
  } catch (error) {
    logError(`Error marking notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

NotificationSchema.statics.cleanupExpiredNotifications = async function(): Promise<number> {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    return result.deletedCount || 0;
  } catch (error) {
    logError(`Error cleaning up expired notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 0;
  }
};

// Pre-save validation
NotificationSchema.pre('save', function(next) {
  try {
    // Ensure title and message are not empty
    if (!this.title?.trim()) {
      return next(new Error('Notification title cannot be empty'));
    }
    
    if (!this.message?.trim()) {
      return next(new Error('Notification message cannot be empty'));
    }

    // Set default expiration if not provided
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Unknown validation error'));
  }
});

export const Notification = mongoose.model<INotification, INotificationModel>('Notification', NotificationSchema);
export default Notification;
