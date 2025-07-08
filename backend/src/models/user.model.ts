import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  email: string;
  password?: string;
  username: string;
  avatar?: string;
  provider: 'manual' | 'google' | 'facebook' | 'instagram' | 'twitter';
  providerId?: string;
  level: number;
  xp: number;
  energy: number;
  maxEnergy: number;
  energyUpdatedAt: Date;
  isOnline: boolean;
  lastSeen: Date;
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
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  calculateWinRate(): number;
  calculateLevel(): number;
  addXP(xp: number): void;
  canPlayGame(): boolean;
  consumeEnergy(): boolean;
  regenerateEnergy(): void;
}

const UserSchema = new Schema<IUser>({
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
  energy: { type: Number, default: 5, min: 0 },
  maxEnergy: { type: Number, default: 5, min: 1 },
  energyUpdatedAt: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
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
  resetPasswordExpires: { type: Date }
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
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ provider: 1, providerId: 1 });
UserSchema.index({ level: 1 });
UserSchema.index({ isOnline: 1 });
UserSchema.index({ 'stats.winRate': -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save middleware to calculate win rate and level
UserSchema.pre('save', function(next) {
  this.stats.winRate = this.calculateWinRate();
  this.level = this.calculateLevel();
  next();
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.calculateWinRate = function(): number {
  if (this.stats.gamesPlayed === 0) return 0;
  return Math.round((this.stats.wins / this.stats.gamesPlayed) * 100);
};

UserSchema.methods.calculateLevel = function(): number {
  const baseXP = 100;
  const multiplier = 1.5;
  let level = 1;
  let requiredXP = baseXP;
  let totalXP = 0;
  
  while (totalXP + requiredXP <= this.xp) {
    totalXP += requiredXP;
    level++;
    requiredXP = Math.floor(baseXP * Math.pow(multiplier, level - 1));
  }
  
  return level;
};

UserSchema.methods.addXP = function(xp: number): void {
  this.xp += xp;
  this.level = this.calculateLevel();
};

UserSchema.methods.canPlayGame = function(): boolean {
  this.regenerateEnergy();
  return this.energy > 0;
};

UserSchema.methods.consumeEnergy = function(): boolean {
  this.regenerateEnergy();
  if (this.energy > 0) {
    this.energy -= 1;
    this.energyUpdatedAt = new Date();
    return true;
  }
  return false;
};

UserSchema.methods.regenerateEnergy = function(): void {
  const now = new Date();
  const timeDiff = now.getTime() - this.energyUpdatedAt.getTime();
  const hoursElapsed = timeDiff / (1000 * 60 * 60);
  const energyToAdd = Math.floor(hoursElapsed / 1.5); // 1 energy per 1.5 hours
  
  if (energyToAdd > 0 && this.energy < this.maxEnergy) {
    this.energy = Math.min(this.energy + energyToAdd, this.maxEnergy);
    this.energyUpdatedAt = new Date(this.energyUpdatedAt.getTime() + (energyToAdd * 1.5 * 60 * 60 * 1000));
  }
};

const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;
