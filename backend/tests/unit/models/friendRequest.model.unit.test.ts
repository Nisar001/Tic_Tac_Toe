import mongoose from 'mongoose';
import FriendRequestModel, { IFriendRequest } from '../../../src/models/friendRequest.model';
import { logError, logDebug } from '../../../src/utils/logger';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logError: jest.fn(),
  logDebug: jest.fn()
}));

describe('FriendRequest Model Unit Tests', () => {
  let requestData: any;
  let senderId: mongoose.Types.ObjectId;
  let receiverId: mongoose.Types.ObjectId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    senderId = new mongoose.Types.ObjectId();
    receiverId = new mongoose.Types.ObjectId();
    
    requestData = {
      sender: senderId,
      receiver: receiverId,
      status: 'pending',
      message: 'Let\'s be friends!'
    };
  });

  describe('Schema Validation', () => {
    it('should create a valid friend request with all required fields', () => {
      const friendRequest = new FriendRequestModel(requestData);
      const validation = friendRequest.validateSync();
      
      expect(validation).toBeUndefined();
      expect(friendRequest.sender).toEqual(senderId);
      expect(friendRequest.receiver).toEqual(receiverId);
      expect(friendRequest.status).toBe('pending');
      expect(friendRequest.message).toBe('Let\'s be friends!');
    });

    it('should create a valid friend request without optional message', () => {
      const requestWithoutMessage = new FriendRequestModel({
        sender: senderId,
        receiver: receiverId
      });
      
      const validation = requestWithoutMessage.validateSync();
      
      expect(validation).toBeUndefined();
      expect(requestWithoutMessage.status).toBe('pending'); // Default value
      expect(requestWithoutMessage.message).toBeUndefined();
    });

    it('should fail validation with missing required fields', () => {
      const invalidRequest = new FriendRequestModel({});
      const validation = invalidRequest.validateSync();
      
      expect(validation).toBeDefined();
      expect(validation?.errors).toBeDefined();
      expect(validation?.errors?.sender).toBeDefined();
      expect(validation?.errors?.receiver).toBeDefined();
    });

    it('should validate sender ObjectId', () => {
      const requestWithInvalidSender = new FriendRequestModel({
        ...requestData,
        sender: 'invalid_id'
      });
      
      const validation = requestWithInvalidSender.validateSync();
      expect(validation?.errors?.sender).toBeDefined();
    });

    it('should validate receiver ObjectId', () => {
      const requestWithInvalidReceiver = new FriendRequestModel({
        ...requestData,
        receiver: 'invalid_id'
      });
      
      const validation = requestWithInvalidReceiver.validateSync();
      expect(validation?.errors?.receiver).toBeDefined();
    });

    it('should validate status enum values', () => {
      const validStatuses = ['pending', 'accepted', 'declined'];
      
      validStatuses.forEach(status => {
        const request = new FriendRequestModel({
          ...requestData,
          status
        });
        
        const validation = request.validateSync();
        expect(validation).toBeUndefined();
      });
    });

    it('should fail validation with invalid status', () => {
      const requestWithInvalidStatus = new FriendRequestModel({
        ...requestData,
        status: 'invalid_status'
      });
      
      const validation = requestWithInvalidStatus.validateSync();
      expect(validation?.errors?.status).toBeDefined();
    });

    it('should validate message length', () => {
      const longMessage = 'a'.repeat(201);
      const requestWithLongMessage = new FriendRequestModel({
        ...requestData,
        message: longMessage
      });
      
      const validation = requestWithLongMessage.validateSync();
      expect(validation?.errors?.message).toBeDefined();
    });

    it('should trim message', () => {
      const request = new FriendRequestModel({
        ...requestData,
        message: '  Hello friend!  '
      });
      
      expect(request.message).toBe('Hello friend!');
    });

    it('should set default values correctly', () => {
      const request = new FriendRequestModel({
        sender: senderId,
        receiver: receiverId
      });
      
      expect(request.status).toBe('pending');
    });
  });

  describe('sanitizeData Method', () => {
    let friendRequest: IFriendRequest;

    beforeEach(() => {
      friendRequest = new FriendRequestModel(requestData);
    });

    it('should sanitize invalid status', () => {
      friendRequest.status = 'invalid' as any;
      friendRequest.sanitizeData();
      
      expect(friendRequest.status).toBe('pending');
    });

    it('should remove script tags from message', () => {
      friendRequest.message = 'Hello <script>alert("xss")</script> friend!';
      friendRequest.sanitizeData();
      
      expect(friendRequest.message).toBe('Hello  friend!');
    });

    it('should remove iframe tags from message', () => {
      friendRequest.message = 'Check <iframe src="malicious.com"></iframe> this out';
      friendRequest.sanitizeData();
      
      expect(friendRequest.message).toBe('Check  this out');
    });

    it('should trim message', () => {
      friendRequest.message = '  Hello friend!  ';
      friendRequest.sanitizeData();
      
      expect(friendRequest.message).toBe('Hello friend!');
    });

    it('should limit message length to 200 characters', () => {
      friendRequest.message = 'a'.repeat(250);
      friendRequest.sanitizeData();
      
      expect(friendRequest.message?.length).toBe(200);
    });

    it('should remove empty message after sanitization', () => {
      friendRequest.message = '<script></script>';
      friendRequest.sanitizeData();
      
      expect(friendRequest.message).toBeUndefined();
    });

    it('should handle non-string message', () => {
      friendRequest.message = 123 as any;
      friendRequest.sanitizeData();
      
      expect(friendRequest.message).toBeUndefined();
    });

    it('should handle null message', () => {
      friendRequest.message = null as any;
      
      expect(() => friendRequest.sanitizeData()).not.toThrow();
    });

    it('should handle sanitization errors gracefully', () => {
      // Mock message to throw an error during processing
      Object.defineProperty(friendRequest, 'message', {
        get() { return 'test'; },
        set() { throw new Error('Test error'); }
      });
      
      expect(() => friendRequest.sanitizeData()).not.toThrow();
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('validateRequest Method', () => {
    let friendRequest: IFriendRequest;

    beforeEach(() => {
      friendRequest = new FriendRequestModel(requestData);
    });

    it('should validate a valid friend request', () => {
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid sender', () => {
      friendRequest.sender = 'invalid' as any;
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid sender ID is required');
    });

    it('should detect missing sender', () => {
      friendRequest.sender = null as any;
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid sender ID is required');
    });

    it('should detect invalid receiver', () => {
      friendRequest.receiver = 'invalid' as any;
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid receiver ID is required');
    });

    it('should detect missing receiver', () => {
      friendRequest.receiver = null as any;
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid receiver ID is required');
    });

    it('should detect self-request', () => {
      friendRequest.receiver = friendRequest.sender;
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Cannot send friend request to yourself');
    });

    it('should detect invalid status', () => {
      friendRequest.status = 'invalid' as any;
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid friend request status');
    });

    it('should detect non-string message', () => {
      friendRequest.message = 123 as any;
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message must be a string');
    });

    it('should detect message that is too long', () => {
      friendRequest.message = 'a'.repeat(201);
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message cannot exceed 200 characters');
    });

    it('should allow undefined message', () => {
      friendRequest.message = undefined;
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(true);
    });

    it('should handle validation errors gracefully', () => {
      // Mock sender to throw an error
      Object.defineProperty(friendRequest, 'sender', {
        get() { throw new Error('Test error'); }
      });
      
      const validation = friendRequest.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Validation process failed');
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('isExpired Method', () => {
    let friendRequest: IFriendRequest;

    beforeEach(() => {
      friendRequest = new FriendRequestModel(requestData);
    });

    it('should return false for non-pending requests', () => {
      friendRequest.status = 'accepted';
      const isExpired = friendRequest.isExpired();
      
      expect(isExpired).toBe(false);
    });

    it('should return false for recent pending requests', () => {
      friendRequest.createdAt = new Date();
      const isExpired = friendRequest.isExpired();
      
      expect(isExpired).toBe(false);
    });

    it('should return true for old pending requests', () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      friendRequest.createdAt = thirtyOneDaysAgo;
      const isExpired = friendRequest.isExpired();
      
      expect(isExpired).toBe(true);
    });

    it('should return false for requests exactly 30 days old', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      friendRequest.createdAt = thirtyDaysAgo;
      const isExpired = friendRequest.isExpired();
      
      expect(isExpired).toBe(false);
    });

    it('should handle missing createdAt gracefully', () => {
      friendRequest.createdAt = null as any;
      const isExpired = friendRequest.isExpired();
      
      expect(isExpired).toBe(false);
    });

    it('should handle expiration check errors gracefully', () => {
      // Mock createdAt to throw an error
      Object.defineProperty(friendRequest, 'createdAt', {
        get() { throw new Error('Test error'); }
      });
      
      const isExpired = friendRequest.isExpired();
      
      expect(isExpired).toBe(false);
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('Pre-save Middleware', () => {
    it('should call sanitizeData before save', async () => {
      const request = new FriendRequestModel(requestData);
      const sanitizeSpy = jest.spyOn(request, 'sanitizeData');
      
      await request.validate();
      
      expect(sanitizeSpy).toHaveBeenCalled();
    });

    it('should call validateRequest before save', async () => {
      const request = new FriendRequestModel(requestData);
      const validateSpy = jest.spyOn(request, 'validateRequest');
      
      await request.validate();
      
      expect(validateSpy).toHaveBeenCalled();
    });

    it('should prevent self-friend requests', async () => {
      const selfRequest = new FriendRequestModel({
        sender: senderId,
        receiver: senderId
      });
      
      await expect(selfRequest.validate()).rejects.toThrow('Cannot send friend request to yourself');
    });

    it('should throw error for invalid request data', async () => {
      const invalidRequest = new FriendRequestModel({
        sender: 'invalid',
        receiver: 'invalid'
      });
      
      await expect(invalidRequest.validate()).rejects.toThrow();
    });

    it('should handle pre-save processing errors gracefully', async () => {
      const request = new FriendRequestModel(requestData);
      
      // Mock sanitizeData to throw an error
      jest.spyOn(request, 'sanitizeData').mockImplementation(() => {
        throw new Error('Test error');
      });
      
      await expect(request.validate()).rejects.toThrow();
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('Static Methods', () => {
    describe('cleanupExpiredRequests', () => {
      beforeEach(() => {
        // Mock the deleteMany method
        jest.spyOn(FriendRequestModel, 'deleteMany').mockResolvedValue({
          deletedCount: 5,
          acknowledged: true
        } as any);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should cleanup expired requests successfully', async () => {
        const deletedCount = await FriendRequestModel.cleanupExpiredRequests();
        
        expect(deletedCount).toBe(5);
        expect(FriendRequestModel.deleteMany).toHaveBeenCalledWith({
          status: 'pending',
          createdAt: { $lt: expect.any(Date) }
        });
        expect(logDebug).toHaveBeenCalledWith('Cleaned up 5 expired friend requests');
      });

      it('should handle cleanup errors gracefully', async () => {
        jest.spyOn(FriendRequestModel, 'deleteMany').mockRejectedValue(new Error('Database error'));
        
        const deletedCount = await FriendRequestModel.cleanupExpiredRequests();
        
        expect(deletedCount).toBe(0);
        expect(logError).toHaveBeenCalled();
      });
    });
  });

  describe('Indexes and Performance', () => {
    it('should have proper indexes defined', () => {
      const indexes = FriendRequestModel.schema.indexes();
      
      // Check if required indexes exist
      const indexFields = indexes.map(index => Object.keys(index[0]));
      
      // Check for unique compound index on sender and receiver
      expect(indexes.some(index => 
        index[1]?.unique === true && 
        'sender' in index[0] && 
        'receiver' in index[0]
      )).toBe(true);
      
      // Check for other performance indexes
      expect(indexFields.some(fields => 
        fields.includes('receiver') && fields.includes('status')
      )).toBe(true);
      
      expect(indexFields.some(fields => 
        fields.includes('sender') && fields.includes('status')
      )).toBe(true);
      
      expect(indexFields.some(fields => 
        fields.includes('createdAt')
      )).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const malformedData = {
        sender: { invalid: 'object' },
        receiver: [],
        status: 123,
        message: { not: 'a string' }
      };
      
      const request = new FriendRequestModel(malformedData);
      const validation = request.validateSync();
      
      expect(validation).toBeDefined();
      expect(validation?.errors).toBeDefined();
    });

    it('should handle extremely long message gracefully', () => {
      const request = new FriendRequestModel(requestData);
      request.message = 'a'.repeat(10000);
      
      request.sanitizeData();
      
      expect(request.message?.length).toBeLessThanOrEqual(200);
    });

    it('should handle complex HTML in message', () => {
      const request = new FriendRequestModel(requestData);
      request.message = '<div><span><script>alert("xss")</script></span><iframe src="evil.com"></iframe></div>';
      
      request.sanitizeData();
      
      expect(request.message).not.toContain('<script>');
      expect(request.message).not.toContain('<iframe>');
    });

    it('should handle ObjectId comparison edge cases', () => {
      const request = new FriendRequestModel(requestData);
      
      // Test with string representations
      request.sender = senderId;
      request.receiver = new mongoose.Types.ObjectId(senderId.toString());
      
      const validation = request.validateRequest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Cannot send friend request to yourself');
    });
  });

  describe('Mongoose Integration', () => {
    it('should properly reference User model', () => {
      const schema = FriendRequestModel.schema;
      
      expect(schema.paths.sender.options.ref).toBe('User');
      expect(schema.paths.receiver.options.ref).toBe('User');
    });

    it('should have timestamps enabled', () => {
      const request = new FriendRequestModel(requestData);
      
      expect(request.createdAt).toBeDefined();
      expect(request.updatedAt).toBeDefined();
    });

    it('should enforce unique constraint on sender-receiver pair', () => {
      const schema = FriendRequestModel.schema;
      const indexes = schema.indexes();
      
      const uniqueIndex = indexes.find(index => 
        index[1]?.unique === true && 
        'sender' in index[0] && 
        'receiver' in index[0]
      );
      
      expect(uniqueIndex).toBeDefined();
    });
  });
});
