import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { logError, logDebug } from '../utils/logger';

export interface IUser extends Document {
  lastRoomJoinTime: any;
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  username: string;
  avatar?: string;
  provider: 'manual' | 'google' | 'facebook' | 'instagram' | 'twitter';
  providerId?: string;
  level: number;
  xp: number;
  totalXP?: number;
  energy: number;
  maxEnergy: number;
  energyUpdatedAt: Date;
  lastEnergyUpdate?: Date;
  lastEnergyRegenTime?: Date;
  lastForfeitTime?: Date | string | null;
  lastLogin?: Date;
  lastLoginMethod?: string;
  lastLoginIP?: string;
  isOnline: boolean;
  lastSeen: Date;
  phoneNumber?: string;
  dateOfBirth?: Date;
  emailVerificationExpiry?: Date;
  registrationIP?: string;
  registrationUserAgent?: string;
  friends: mongoose.Types.ObjectId[];
  friendRequests: {
    sent: mongoose.Types.ObjectId[];
    received: mongoose.Types.ObjectId[];
  };
  stats: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
    winRate: number;
  };
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastPasswordChange?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  passwordResetExpires?: Date; // Alias for compatibility
  isDeleted?: boolean;
  deletedAt?: Date;
  bio?: string;
  isBlocked?: boolean;
  lastProfileUpdate?: Date;
  lastPasswordResetRequest?: Date;
  lastVerificationRequest?: Date;
  failedLoginAttempts?: number;
  lastFailedLogin?: Date;
  isLocked?: boolean;
  lockedUntil?: Date;
  lastMessageTime?: Date;
  lastEnergyNotification?: Date;
  refreshTokens?: Array<{
    token: string;
    createdAt: Date;
    expiresAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  calculateWinRate(): number;
  calculateLevel(): number;
  addXP(xp: number): void;
  canPlayGame(): boolean;
  consumeEnergy(): boolean;
  regenerateEnergy(): void;
  sanitizeData(): void;
  validateUserData(): { isValid: boolean; errors: string[] };
}

const UserSchema = new Schema<IUser>({
  _id: { type: Schema.Types.ObjectId, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: { 
    type: String,
    minlength: [6, 'Password must be at least 6 characters long'],
    validate: {
      validator: function(this: IUser, password: string) {
        return this.provider === 'manual' ? !!password : true;
      },
      message: 'Password is required for manual registration'
    }
  },
  username: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  avatar: { 
    type: String,
    default: 'https://via.placeholder.com/150x150?text=Avatar'
  },
  provider: { 
    type: String, 
    enum: ['manual', 'google', 'facebook', 'instagram', 'twitter'], 
    required: true 
  },
  providerId: { type: String },
  level: { type: Number, default: 1, min: 1 },
  xp: { type: Number, default: 0, min: 0 },
  totalXP: { type: Number, default: 0, min: 0 },
  energy: { type: Number, default: 5, min: 0 },
  maxEnergy: { type: Number, default: 5, min: 1 },
  energyUpdatedAt: { type: Date, default: Date.now },
  lastEnergyUpdate: { type: Date },
  lastEnergyRegenTime: { type: Date },
  lastForfeitTime: { type: Date, default: null },
  lastLogin: { type: Date },
  lastLoginMethod: { type: String },
  lastLoginIP: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  phoneNumber: { type: String },
  dateOfBirth: { type: Date },
  emailVerificationExpiry: { type: Date },
  registrationIP: { type: String },
  registrationUserAgent: { type: String },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: {
    sent: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    received: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  stats: {
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    draws: { type: Number, default: 0, min: 0 },
    gamesPlayed: { type: Number, default: 0, min: 0 },
    winRate: { type: Number, default: 0, min: 0, max: 100 }
  },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  lastPasswordChange: { type: Date },
  passwordResetToken: { type: String },
  passwordResetTokenExpiry: { type: Date },
  passwordResetExpires: { type: Date }, // Alias for compatibility
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  bio: { type: String },
  isBlocked: { type: Boolean, default: false },
  lastProfileUpdate: { type: Date },  
  lastPasswordResetRequest: { type: Date },
  lastVerificationRequest: { type: Date },
  failedLoginAttempts: { type: Number, default: 0, min: 0 },
  lastFailedLogin: { type: Date },
  isLocked: { type: Boolean, default: false },
  lockedUntil: { type: Date },
  lastMessageTime: { type: Date },
  lastEnergyNotification: { type: Date },
  refreshTokens: [{
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  }]
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  }
});

// Indexes for better performance
UserSchema.index({ provider: 1, providerId: 1 });
UserSchema.index({ level: 1 });
UserSchema.index({ isOnline: 1 });
UserSchema.index({ 'stats.winRate': -1 });

// Pre-save middleware to hash password with enhanced error handling
UserSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password') || !this.password) return next();
    
    // Validate password strength
    if (this.password.length < 6) {
      return next(new Error('Password must be at least 6 characters long'));
    }
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    logError(`Password hashing error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error as Error);
  }
});

// Pre-save middleware to calculate win rate and level with error handling
UserSchema.pre('save', function(next) {
  try {
    this.sanitizeData();
    const validation = this.validateUserData();
    
    if (!validation.isValid) {
      logError(`User validation failed for ${this.email}: ${validation.errors.join(', ')}`);
      return next(new Error(`User validation failed: ${validation.errors.join(', ')}`));
    }
    
    this.stats.winRate = this.calculateWinRate();
    this.level = this.calculateLevel();
    next();
  } catch (error) {
    logError(`Pre-save processing error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error as Error);
  }
});

// Instance methods with comprehensive error handling
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password || !candidatePassword) {
      logDebug(`Password comparison failed: missing password data for user ${this.email}`);
      return false;
    }
    
    if (typeof candidatePassword !== 'string') {
      logError(`Invalid candidate password type for user ${this.email}`);
      return false;
    }
    
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    logError(`Password comparison error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

UserSchema.methods.calculateWinRate = function(): number {
  try {
    if (!this.stats || typeof this.stats.gamesPlayed !== 'number' || this.stats.gamesPlayed === 0) {
      return 0;
    }
    
    const wins = Math.max(0, this.stats.wins || 0);
    const gamesPlayed = Math.max(1, this.stats.gamesPlayed);
    
    return Math.round((wins / gamesPlayed) * 100);
  } catch (error) {
    logError(`Win rate calculation error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 0;
  }
};

UserSchema.methods.calculateLevel = function(): number {
  try {
    const baseXP = 100;
    const multiplier = 1.5;
    let level = 1;
    let requiredXP = baseXP;
    let totalXP = 0;
    const currentXP = Math.max(0, this.xp || 0);
    
    // Prevent infinite loops
    const maxLevel = 100;
    
    while (totalXP + requiredXP <= currentXP && level < maxLevel) {
      totalXP += requiredXP;
      level++;
      requiredXP = Math.floor(baseXP * Math.pow(multiplier, level - 1));
      
      // Additional safety check
      if (requiredXP > 1000000) break;
    }
    
    return Math.min(level, maxLevel);
  } catch (error) {
    logError(`Level calculation error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 1;
  }
};

UserSchema.methods.addXP = function(xp: number): void {
  try {
    if (typeof xp !== 'number' || isNaN(xp) || xp < 0) {
      logError(`Invalid XP value for user ${this.email}: ${xp}`);
      return;
    }
    
    const maxXPGain = 10000; // Prevent abuse
    const safeXP = Math.min(xp, maxXPGain);
    
    this.xp = Math.max(0, (this.xp || 0) + safeXP);
    this.level = this.calculateLevel();
  } catch (error) {
    logError(`Add XP error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

UserSchema.methods.canPlayGame = function(): boolean {
  try {
    this.regenerateEnergy();
    return (this.energy || 0) > 0;
  } catch (error) {
    logError(`Can play game check error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

UserSchema.methods.consumeEnergy = function(): boolean {
  try {
    this.regenerateEnergy();
    
    if ((this.energy || 0) > 0) {
      this.energy = Math.max(0, (this.energy || 0) - 1);
      this.energyUpdatedAt = new Date();
      return true;
    }
    return false;
  } catch (error) {
    logError(`Energy consumption error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

UserSchema.methods.regenerateEnergy = function(): void {
  try {
    const now = new Date();
    const lastUpdate = this.energyUpdatedAt || now;
    const timeDiff = now.getTime() - lastUpdate.getTime();
    
    // Prevent negative time differences
    if (timeDiff < 0) {
      logError(`Negative time difference detected for user ${this.email}`);
      this.energyUpdatedAt = now;
      return;
    }
    
    const hoursElapsed = timeDiff / (1000 * 60 * 60);
    const energyToAdd = Math.floor(hoursElapsed / 1.5); // 1 energy per 1.5 hours
    
    if (energyToAdd > 0 && (this.energy || 0) < (this.maxEnergy || 5)) {
      const currentEnergy = Math.max(0, this.energy || 0);
      const maxEnergy = Math.max(1, this.maxEnergy || 5);
      
      this.energy = Math.min(currentEnergy + energyToAdd, maxEnergy);
      this.energyUpdatedAt = new Date(lastUpdate.getTime() + (energyToAdd * 1.5 * 60 * 60 * 1000));
    }
  } catch (error) {
    logError(`Energy regeneration error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

UserSchema.methods.sanitizeData = function(): void {
  try {
    // Sanitize strings
    if (this.email) this.email = this.email.toString().trim().toLowerCase();
    if (this.username) this.username = this.username.toString().trim();
    if (this.avatar) this.avatar = this.avatar.toString().trim();
    
    // Sanitize numbers
    this.level = Math.max(1, Math.min(100, Math.floor(this.level || 1)));
    this.xp = Math.max(0, Math.floor(this.xp || 0));
    this.energy = Math.max(0, Math.min(this.maxEnergy || 5, Math.floor(this.energy || 0)));
    this.maxEnergy = Math.max(1, Math.min(20, Math.floor(this.maxEnergy || 5)));
    
    // Sanitize stats
    if (!this.stats) this.stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, winRate: 0 };
    this.stats.wins = Math.max(0, Math.floor(this.stats.wins || 0));
    this.stats.losses = Math.max(0, Math.floor(this.stats.losses || 0));
    this.stats.draws = Math.max(0, Math.floor(this.stats.draws || 0));
    this.stats.gamesPlayed = Math.max(0, Math.floor(this.stats.gamesPlayed || 0));
    
    // Sanitize arrays
    if (!Array.isArray(this.friends)) this.friends = [];
    if (!this.friendRequests) this.friendRequests = { sent: [], received: [] };
    if (!Array.isArray(this.friendRequests.sent)) this.friendRequests.sent = [];
    if (!Array.isArray(this.friendRequests.received)) this.friendRequests.received = [];
    
    // Sanitize dates
    if (!this.energyUpdatedAt || !(this.energyUpdatedAt instanceof Date)) {
      this.energyUpdatedAt = new Date();
    }
    if (!this.lastSeen || !(this.lastSeen instanceof Date)) {
      this.lastSeen = new Date();
    }
  } catch (error) {
    logError(`Data sanitization error for user ${this.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

UserSchema.methods.validateUserData = function(): { isValid: boolean; errors: string[] } {
  try {
    const errors: string[] = [];
    
    // Email validation
    if (!this.email || typeof this.email !== 'string') {
      errors.push('Email is required and must be a string');
    } else if (!/^\S+@\S+\.\S+$/.test(this.email)) {
      errors.push('Email format is invalid');
    }
    
    // Username validation
    if (!this.username || typeof this.username !== 'string') {
      errors.push('Username is required and must be a string');
    } else if (this.username.length < 3 || this.username.length > 20) {
      errors.push('Username must be between 3 and 20 characters');
    } else if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
      errors.push('Username can only contain letters, numbers and underscores');
    }
    
    // Provider validation
    const validProviders = ['manual', 'google', 'facebook', 'instagram', 'twitter'];
    if (!validProviders.includes(this.provider)) {
      errors.push('Invalid provider');
    }
    
    // Password validation for manual provider
    if (this.provider === 'manual' && (!this.password || this.password.length < 6)) {
      errors.push('Password is required and must be at least 6 characters for manual registration');
    }
    
    // Numeric field validation
    if (typeof this.level !== 'number' || this.level < 1 || this.level > 100) {
      errors.push('Level must be a number between 1 and 100');
    }
    
    if (typeof this.xp !== 'number' || this.xp < 0) {
      errors.push('XP must be a non-negative number');
    }
    
    if (typeof this.energy !== 'number' || this.energy < 0) {
      errors.push('Energy must be a non-negative number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logError(`User data validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      errors: ['Validation process failed']
    };
  }
};

const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;
