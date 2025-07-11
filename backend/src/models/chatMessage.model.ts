import mongoose, { Document, Schema } from 'mongoose';
import { logError, logDebug } from '../utils/logger';

export interface IChatMessage extends Document {
  gameId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
  messageType: 'text' | 'emoji' | 'system';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  sanitizeMessage(): void;
  validateMessage(): { isValid: boolean; errors: string[] };
  isSpam(): boolean;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  gameId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Game', 
    required: true 
  },
  sender: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  message: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters'],
    validate: {
      validator: function(message: string): boolean {
        try {
          return !!(message && message.trim().length > 0 && message.trim().length <= 500);
        } catch (error) {
          logError(`Message validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      },
      message: 'Message must be between 1 and 500 characters'
    }
  },
  timestamp: { type: Date, default: Date.now },
  messageType: {
    type: String,
    enum: ['text', 'emoji', 'system'],
    default: 'text'
  },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes for better performance
ChatMessageSchema.index({ gameId: 1, timestamp: -1 });
ChatMessageSchema.index({ sender: 1 });
ChatMessageSchema.index({ messageType: 1 });
ChatMessageSchema.index({ timestamp: -1 });

// Pre-save middleware with error handling
ChatMessageSchema.pre('save', function(next) {
  try {
    // Sanitize message
    if (this.message) {
      this.message = this.message.trim().slice(0, 500);
    }
    
    // Basic validation
    if (!this.message || this.message.length === 0) {
      logError(`Chat message validation failed for game ${this.gameId}: Empty message`);
      return next(new Error('Message cannot be empty'));
    }
    
    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/, // repeated characters (5 or more)
      /^\s*(.+?)\s*\1+\s*$/i, // repeated words
      /(https?:\/\/[^\s]+){3,}/i, // multiple URLs
    ];
    
    const isSpam = spamPatterns.some(pattern => pattern.test(this.message));
    if (isSpam) {
      logError(`Spam message detected for game ${this.gameId} from user ${this.sender}`);
      return next(new Error('Message appears to be spam'));
    }
    
    next();
  } catch (error) {
    logError(`Pre-save processing error for chat message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error as Error);
  }
});

// Instance methods with comprehensive error handling
ChatMessageSchema.methods.sanitizeMessage = function(): void {
  try {
    // Sanitize message content
    if (typeof this.message === 'string') {
      // Remove dangerous HTML/script tags
      this.message = this.message
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/<link\b[^<]*>/gi, '')
        .replace(/<meta\b[^<]*>/gi, '')
        .trim();
      
      // Limit length
      if (this.message.length > 500) {
        this.message = this.message.substring(0, 500);
      }
    }
    
    // Sanitize message type
    const validTypes = ['text', 'emoji', 'system'];
    if (!validTypes.includes(this.messageType)) {
      this.messageType = 'text';
    }
    
    // Sanitize timestamp
    if (!this.timestamp || !(this.timestamp instanceof Date)) {
      this.timestamp = new Date();
    }
    
    // Sanitize boolean fields
    this.isRead = Boolean(this.isRead);
  } catch (error) {
    logError(`Message sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

ChatMessageSchema.methods.validateMessage = function(): { isValid: boolean; errors: string[] } {
  try {
    const errors: string[] = [];
    
    // Validate gameId
    if (!this.gameId || !mongoose.Types.ObjectId.isValid(this.gameId)) {
      errors.push('Valid game ID is required');
    }
    
    // Validate sender
    if (!this.sender || !mongoose.Types.ObjectId.isValid(this.sender)) {
      errors.push('Valid sender ID is required');
    }
    
    // Validate message content
    if (!this.message || typeof this.message !== 'string') {
      errors.push('Message content is required and must be a string');
    } else {
      const trimmedMessage = this.message.trim();
      if (trimmedMessage.length === 0) {
        errors.push('Message cannot be empty');
      } else if (trimmedMessage.length > 500) {
        errors.push('Message cannot exceed 500 characters');
      }
    }
    
    // Validate message type
    const validTypes = ['text', 'emoji', 'system'];
    if (!validTypes.includes(this.messageType)) {
      errors.push('Invalid message type');
    }
    
    // Validate timestamp
    if (!this.timestamp || !(this.timestamp instanceof Date)) {
      errors.push('Valid timestamp is required');
    } else if (this.timestamp > new Date()) {
      errors.push('Timestamp cannot be in the future');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logError(`Message validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      errors: ['Validation process failed']
    };
  }
};

ChatMessageSchema.methods.isSpam = function(): boolean {
  try {
    if (!this.message || typeof this.message !== 'string') {
      return false;
    }
    
    const message = this.message.toLowerCase().trim();
    
    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /(http|https):\/\/[^\s]+/gi, // URLs (basic detection)
      /(.{1,10})\1{5,}/, // Repeated patterns
      /[^\w\s]{20,}/, // Too many special characters
    ];
    
    for (const pattern of spamPatterns) {
      if (pattern.test(message)) {
        return true;
      }
    }
    
    // Check message length vs content ratio
    if (message.length > 100) {
      const uniqueChars = new Set(message).size;
      const ratio = uniqueChars / message.length;
      if (ratio < 0.1) { // Less than 10% unique characters
        return true;
      }
    }
    
    // Check for excessive capitalization
    const upperCaseCount = (message.match(/[A-Z]/g) || []).length;
    if (message.length > 20 && upperCaseCount / message.length > 0.7) {
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`Spam detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false; // Default to not spam on error
  }
};

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
