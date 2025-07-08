import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage extends Document {
  gameId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
  messageType: 'text' | 'emoji' | 'system';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
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
    maxlength: [500, 'Message cannot exceed 500 characters']
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

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
