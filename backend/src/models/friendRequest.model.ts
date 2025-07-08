import mongoose, { Document, Schema } from 'mongoose';

export interface IFriendRequest extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>({
  sender: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiver: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [200, 'Message cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Prevent duplicate friend requests
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
FriendRequestSchema.index({ receiver: 1, status: 1 });
FriendRequestSchema.index({ sender: 1, status: 1 });

// Pre-save validation to prevent self-friend requests
FriendRequestSchema.pre('save', function(next) {
  if (this.sender.toString() === this.receiver.toString()) {
    return next(new Error('Cannot send friend request to yourself'));
  }
  next();
});

export default mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);
