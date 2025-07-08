// Unit tests for chatMessage.model.ts
import mongoose from 'mongoose';
import ChatMessage, { IChatMessage } from '../../../src/models/chatMessage.model';

describe('ChatMessage Model', () => {
  it('should create a valid chat message', async () => {
    const chatMessageData: Partial<IChatMessage> = {
      gameId: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      message: 'Hello, world!',
      messageType: 'text',
    };

    const chatMessage = new ChatMessage(chatMessageData);
    const validationError = chatMessage.validateSync();

    expect(validationError).toBeUndefined();
  });

  it('should throw validation error for missing required fields', async () => {
    const chatMessage = new ChatMessage({});
    const validationError = chatMessage.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['gameId']).toBeDefined();
    expect(validationError?.errors['sender']).toBeDefined();
    expect(validationError?.errors['message']).toBeDefined();
  });

  it('should throw validation error for invalid message type', async () => {
    const chatMessageData: Partial<IChatMessage> = {
      gameId: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      message: 'Hello, world!',
      messageType: 'invalid',
    };

    const chatMessage = new ChatMessage(chatMessageData);
    const validationError = chatMessage.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['messageType']).toBeDefined();
  });

  it('should throw validation error for message exceeding max length', async () => {
    const chatMessageData: Partial<IChatMessage> = {
      gameId: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      message: 'a'.repeat(501),
      messageType: 'text',
    };

    const chatMessage = new ChatMessage(chatMessageData);
    const validationError = chatMessage.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['message']).toBeDefined();
  });

  it('should set default values for optional fields', async () => {
    const chatMessageData: Partial<IChatMessage> = {
      gameId: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      message: 'Hello, world!',
    };

    const chatMessage = new ChatMessage(chatMessageData);

    expect(chatMessage.timestamp).toBeDefined();
    expect(chatMessage.isRead).toBe(false);
    expect(chatMessage.messageType).toBe('text');
  });
});
