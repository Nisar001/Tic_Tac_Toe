import mongoose, { Document, Schema, Model } from 'mongoose';
import { logError, logDebug } from '../utils/logger';

export interface IFriendRequest extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  sanitizeData(): void;
  validateRequest(): { isValid: boolean; errors: string[] };
  isExpired(): boolean;
}

export interface IFriendRequestModel extends Model<IFriendRequest> {
  cleanupExpiredRequests(): Promise<number>;
}

const FriendRequestSchema = new Schema<IFriendRequest>({
  sender: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    validate: {
      validator: function(sender: mongoose.Types.ObjectId) {
        try {
          return mongoose.Types.ObjectId.isValid(sender);
        } catch (error) {
          logError(`Sender validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      },
      message: 'Sender must be a valid ObjectId'
    }
  },
  receiver: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    validate: {
      validator: function(receiver: mongoose.Types.ObjectId) {
        try {
          return mongoose.Types.ObjectId.isValid(receiver);
        } catch (error) {
          logError(`Receiver validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      },
      message: 'Receiver must be a valid ObjectId'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [200, 'Message cannot exceed 200 characters'],
    validate: {
      validator: function(message: string) {
        try {
          if (!message) return true; // Optional field
          return typeof message === 'string' && message.trim().length <= 200;
        } catch (error) {
          logError(`Message validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      },
      message: 'Message must be a string with maximum 200 characters'
    }
  }
}, {
  timestamps: true
});

// Prevent duplicate friend requests
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
FriendRequestSchema.index({ receiver: 1, status: 1 });
FriendRequestSchema.index({ sender: 1, status: 1 });
FriendRequestSchema.index({ createdAt: 1 }); // For cleanup of old requests

// Pre-save validation with comprehensive error handling
FriendRequestSchema.pre('save', function(next) {
  try {
    this.sanitizeData();
    const validation = this.validateRequest();
    
    if (!validation.isValid) {
      logError(`Friend request validation failed: ${validation.errors.join(', ')}`);
      return next(new Error(`Friend request validation failed: ${validation.errors.join(', ')}`));
    }
    
    // Prevent self-friend requests
    if (this.sender.toString() === this.receiver.toString()) {
      logError(`Self-friend request attempt from user ${this.sender}`);
      return next(new Error('Cannot send friend request to yourself'));
    }
    
    next();
  } catch (error) {
    logError(`Pre-save processing error for friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error as Error);
  }
});

// Instance methods with comprehensive error handling
FriendRequestSchema.methods.sanitizeData = function(): void {
  try {
    // Sanitize status
    const validStatuses = ['pending', 'accepted', 'declined'];
    if (!validStatuses.includes(this.status)) {
      this.status = 'pending';
    }
    
    // Sanitize message
    if (this.message) {
      if (typeof this.message === 'string') {
        // Remove dangerous content
        this.message = this.message
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .trim();
        
        // Limit length
        if (this.message.length > 200) {
          this.message = this.message.substring(0, 200);
        }
        
        // Remove if empty after sanitization
        if (this.message.length === 0) {
          this.message = undefined;
        }
      } else {
        this.message = undefined;
      }
    }
  } catch (error) {
    logError(`Friend request data sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

FriendRequestSchema.methods.validateRequest = function(): { isValid: boolean; errors: string[] } {
  try {
    const errors: string[] = [];
    
    // Validate sender
    if (!this.sender || !mongoose.Types.ObjectId.isValid(this.sender)) {
      errors.push('Valid sender ID is required');
    }
    
    // Validate receiver
    if (!this.receiver || !mongoose.Types.ObjectId.isValid(this.receiver)) {
      errors.push('Valid receiver ID is required');
    }
    
    // Check for self-request
    if (this.sender && this.receiver && this.sender.toString() === this.receiver.toString()) {
      errors.push('Cannot send friend request to yourself');
    }
    
    // Validate status
    const validStatuses = ['pending', 'accepted', 'declined'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid friend request status');
    }
    
    // Validate message if provided
    if (this.message) {
      if (typeof this.message !== 'string') {
        errors.push('Message must be a string');
      } else if (this.message.trim().length > 200) {
        errors.push('Message cannot exceed 200 characters');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logError(`Friend request validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      errors: ['Validation process failed']
    };
  }
};

FriendRequestSchema.methods.isExpired = function(): boolean {
  try {
    if (this.status !== 'pending') {
      return false; // Only pending requests can expire
    }
    
    const now = new Date();
    const createdAt = this.createdAt || new Date();
    const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Consider requests older than 30 days as expired
    return daysSinceCreated > 30;
  } catch (error) {
    logError(`Friend request expiration check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

// Static method for cleanup with error handling
(FriendRequestSchema.statics as any).cleanupExpiredRequests = async function() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await this.deleteMany({
      status: 'pending',
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    logDebug(`Cleaned up ${result.deletedCount} expired friend requests`);
    return result.deletedCount;
  } catch (error) {
    logError(`Friend request cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 0;
  }
};

export default mongoose.model<IFriendRequest, IFriendRequestModel>('FriendRequest', FriendRequestSchema);
