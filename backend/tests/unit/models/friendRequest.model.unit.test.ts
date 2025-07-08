// Unit tests for friendRequest.model.ts
import mongoose from 'mongoose';
import FriendRequest, { IFriendRequest } from '../../../src/models/friendRequest.model';

describe('FriendRequest Model', () => {
  it('should create a valid friend request', async () => {
    const friendRequestData: Partial<IFriendRequest> = {
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      status: 'pending',
    };

    const friendRequest = new FriendRequest(friendRequestData);
    const validationError = friendRequest.validateSync();

    expect(validationError).toBeUndefined();
  });

  it('should throw validation error for missing required fields', async () => {
    const friendRequest = new FriendRequest({});
    const validationError = friendRequest.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['sender']).toBeDefined();
    expect(validationError?.errors['receiver']).toBeDefined();
  });

  it('should throw validation error for invalid status', async () => {
    const friendRequestData: Partial<IFriendRequest> = {
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      status: 'invalid',
    };

    const friendRequest = new FriendRequest(friendRequestData);
    const validationError = friendRequest.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['status']).toBeDefined();
  });

  it('should throw validation error for message exceeding max length', async () => {
    const friendRequestData: Partial<IFriendRequest> = {
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      message: 'a'.repeat(201),
    };

    const friendRequest = new FriendRequest(friendRequestData);
    const validationError = friendRequest.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['message']).toBeDefined();
  });

  it('should prevent self-friend requests', async () => {
    const friendRequestData: Partial<IFriendRequest> = {
      sender: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      receiver: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    };

    const friendRequest = new FriendRequest(friendRequestData);

    await expect(friendRequest.save()).rejects.toThrow('Cannot send friend request to yourself');
  });

  it('should set default values for optional fields', async () => {
    const friendRequestData: Partial<IFriendRequest> = {
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
    };

    const friendRequest = new FriendRequest(friendRequestData);

    expect(friendRequest.status).toBe('pending');
    expect(friendRequest.message).toBeUndefined();
  });
});
