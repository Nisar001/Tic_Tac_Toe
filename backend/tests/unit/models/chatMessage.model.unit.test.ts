import mongoose from 'mongoose';
import ChatMessageModel, { IChatMessage } from '../../../src/models/chatMessage.model';
import { logError, logDebug } from '../../../src/utils/logger';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logError: jest.fn(),
  logDebug: jest.fn()
}));

describe('ChatMessage Model Unit Tests', () => {
  let messageData: any;
  let gameId: mongoose.Types.ObjectId;
  let senderId: mongoose.Types.ObjectId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    gameId = new mongoose.Types.ObjectId();
    senderId = new mongoose.Types.ObjectId();
    
    messageData = {
      gameId,
      sender: senderId,
      message: 'Hello, this is a test message!',
      messageType: 'text',
      isRead: false
    };
  });

  describe('Schema Validation', () => {
    it('should create a valid chat message with all required fields', () => {
      const chatMessage = new ChatMessageModel(messageData);
      const validation = chatMessage.validateSync();
      
      expect(validation).toBeUndefined();
      expect(chatMessage.gameId).toEqual(gameId);
      expect(chatMessage.sender).toEqual(senderId);
      expect(chatMessage.message).toBe('Hello, this is a test message!');
      expect(chatMessage.messageType).toBe('text');
      expect(chatMessage.isRead).toBe(false);
    });

    it('should fail validation with missing required fields', () => {
      const invalidMessage = new ChatMessageModel({});
      const validation = invalidMessage.validateSync();
      
      expect(validation).toBeDefined();
      expect(validation?.errors).toBeDefined();
      expect(validation?.errors?.gameId).toBeDefined();
      expect(validation?.errors?.sender).toBeDefined();
      expect(validation?.errors?.message).toBeDefined();
    });

    it('should trim and validate message length', () => {
      const longMessage = 'a'.repeat(501);
      const messageWithLongText = new ChatMessageModel({
        ...messageData,
        message: longMessage
      });
      
      const validation = messageWithLongText.validateSync();
      expect(validation?.errors?.message).toBeDefined();
    });

    it('should validate empty message', () => {
      const messageWithEmptyText = new ChatMessageModel({
        ...messageData,
        message: ''
      });
      
      const validation = messageWithEmptyText.validateSync();
      expect(validation?.errors?.message).toBeDefined();
    });

    it('should validate whitespace-only message', () => {
      const messageWithWhitespace = new ChatMessageModel({
        ...messageData,
        message: '   '
      });
      
      const validation = messageWithWhitespace.validateSync();
      expect(validation?.errors?.message).toBeDefined();
    });

    it('should validate messageType enum values', () => {
      const validTypes = ['text', 'emoji', 'system'];
      
      validTypes.forEach(type => {
        const message = new ChatMessageModel({
          ...messageData,
          messageType: type
        });
        
        const validation = message.validateSync();
        expect(validation).toBeUndefined();
      });
    });

    it('should fail validation with invalid messageType', () => {
      const messageWithInvalidType = new ChatMessageModel({
        ...messageData,
        messageType: 'invalid_type'
      });
      
      const validation = messageWithInvalidType.validateSync();
      expect(validation?.errors?.messageType).toBeDefined();
    });

    it('should set default values correctly', () => {
      const message = new ChatMessageModel({
        gameId,
        sender: senderId,
        message: 'Test message'
      });
      
      expect(message.messageType).toBe('text');
      expect(message.isRead).toBe(false);
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('sanitizeMessage Method', () => {
    let chatMessage: IChatMessage;

    beforeEach(() => {
      chatMessage = new ChatMessageModel(messageData);
    });

    it('should remove script tags from message', () => {
      chatMessage.message = 'Hello <script>alert("xss")</script> world';
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.message).toBe('Hello  world');
    });

    it('should remove iframe tags from message', () => {
      chatMessage.message = 'Test <iframe src="malicious.com"></iframe> message';
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.message).toBe('Test  message');
    });

    it('should remove object tags from message', () => {
      chatMessage.message = 'Content <object data="malicious.swf"></object> here';
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.message).toBe('Content  here');
    });

    it('should remove embed tags from message', () => {
      chatMessage.message = 'Video <embed src="video.mp4"> content';
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.message).toBe('Video  content');
    });

    it('should remove link and meta tags from message', () => {
      chatMessage.message = 'Text <link rel="stylesheet"> and <meta charset="utf8"> more';
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.message).toBe('Text  and  more');
    });

    it('should trim message', () => {
      chatMessage.message = '  Hello world  ';
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.message).toBe('Hello world');
    });

    it('should limit message length to 500 characters', () => {
      chatMessage.message = 'a'.repeat(600);
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.message.length).toBe(500);
    });

    it('should sanitize invalid messageType', () => {
      chatMessage.messageType = 'invalid' as any;
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.messageType).toBe('text');
    });

    it('should sanitize invalid timestamp', () => {
      chatMessage.timestamp = null as any;
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.timestamp).toBeInstanceOf(Date);
    });

    it('should sanitize boolean isRead field', () => {
      chatMessage.isRead = 'true' as any;
      chatMessage.sanitizeMessage();
      
      expect(chatMessage.isRead).toBe(true);
      expect(typeof chatMessage.isRead).toBe('boolean');
    });

    it('should handle non-string message gracefully', () => {
      chatMessage.message = 123 as any;
      
      expect(() => chatMessage.sanitizeMessage()).not.toThrow();
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('validateMessage Method', () => {
    let chatMessage: IChatMessage;

    beforeEach(() => {
      chatMessage = new ChatMessageModel(messageData);
    });

    it('should validate a valid message', () => {
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid gameId', () => {
      chatMessage.gameId = 'invalid' as any;
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid game ID is required');
    });

    it('should detect missing gameId', () => {
      chatMessage.gameId = null as any;
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid game ID is required');
    });

    it('should detect invalid sender', () => {
      chatMessage.sender = 'invalid' as any;
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid sender ID is required');
    });

    it('should detect missing sender', () => {
      chatMessage.sender = null as any;
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid sender ID is required');
    });

    it('should detect non-string message', () => {
      chatMessage.message = 123 as any;
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message content is required and must be a string');
    });

    it('should detect empty message', () => {
      chatMessage.message = '';
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message cannot be empty');
    });

    it('should detect whitespace-only message', () => {
      chatMessage.message = '   ';
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message cannot be empty');
    });

    it('should detect message that is too long', () => {
      chatMessage.message = 'a'.repeat(501);
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message cannot exceed 500 characters');
    });

    it('should detect invalid messageType', () => {
      chatMessage.messageType = 'invalid' as any;
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid message type');
    });

    it('should detect invalid timestamp', () => {
      chatMessage.timestamp = 'invalid' as any;
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid timestamp is required');
    });

    it('should detect future timestamp', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      chatMessage.timestamp = futureDate;
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Timestamp cannot be in the future');
    });

    it('should handle validation errors gracefully', () => {
      // Mock a property that throws an error
      Object.defineProperty(chatMessage, 'gameId', {
        get() { throw new Error('Test error'); }
      });
      
      const validation = chatMessage.validateMessage();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Validation process failed');
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('isSpam Method', () => {
    let chatMessage: IChatMessage;

    beforeEach(() => {
      chatMessage = new ChatMessageModel(messageData);
    });

    it('should return false for normal message', () => {
      chatMessage.message = 'Hello, how are you doing today?';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(false);
    });

    it('should detect repeated characters as spam', () => {
      chatMessage.message = 'Helloooooooooooo';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(true);
    });

    it('should detect URLs as potential spam', () => {
      chatMessage.message = 'Check out this link: http://suspicious-site.com';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(true);
    });

    it('should detect HTTPS URLs as potential spam', () => {
      chatMessage.message = 'Visit https://another-site.com for more info';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(true);
    });

    it('should detect repeated patterns as spam', () => {
      chatMessage.message = 'buybuybuybuybuybuybuy';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(true);
    });

    it('should detect excessive special characters as spam', () => {
      chatMessage.message = '!!!!!!!!!!!!!!!!!!!!!@#$%^&*()_+{}[]';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(true);
    });

    it('should detect low character diversity in long messages as spam', () => {
      chatMessage.message = 'aaaaaabbbbbbccccccddddddeeeeeeffffffffgggggghhhhhhiiiiiijjjjjjkkkkkkllllllmmmmmm';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(true);
    });

    it('should detect excessive capitalization as spam', () => {
      chatMessage.message = 'THIS IS A VERY LOUD MESSAGE WITH TOO MUCH CAPS';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(true);
    });

    it('should handle short messages with caps correctly', () => {
      chatMessage.message = 'YES!';
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(false);
    });

    it('should handle null/undefined message gracefully', () => {
      chatMessage.message = null as any;
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(false);
    });

    it('should handle non-string message gracefully', () => {
      chatMessage.message = 123 as any;
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(false);
    });

    it('should handle spam detection errors gracefully', () => {
      // Mock message to throw an error
      Object.defineProperty(chatMessage, 'message', {
        get() { throw new Error('Test error'); }
      });
      
      const isSpam = chatMessage.isSpam();
      
      expect(isSpam).toBe(false);
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('Pre-save Middleware', () => {
    it('should trim message before save', async () => {
      const message = new ChatMessageModel({
        ...messageData,
        message: '  Hello world  '
      });
      
      await message.validate();
      
      expect(message.message).toBe('Hello world');
    });

    it('should limit message length before save', async () => {
      const message = new ChatMessageModel({
        ...messageData,
        message: 'a'.repeat(600)
      });
      
      await message.validate();
      
      expect(message.message.length).toBeLessThanOrEqual(500);
    });

    it('should throw error for empty message', async () => {
      const message = new ChatMessageModel({
        ...messageData,
        message: ''
      });
      
      await expect(message.validate()).rejects.toThrow('Message cannot be empty');
    });

    it('should detect and reject spam messages', async () => {
      const message = new ChatMessageModel({
        ...messageData,
        message: 'Helloooooooooooo'
      });
      
      await expect(message.validate()).rejects.toThrow('Message appears to be spam');
    });

    it('should handle pre-save processing errors gracefully', async () => {
      const message = new ChatMessageModel(messageData);
      
      // Mock trim to throw an error
      jest.spyOn(String.prototype, 'trim').mockImplementation(() => {
        throw new Error('Test error');
      });
      
      await expect(message.validate()).rejects.toThrow();
      expect(logError).toHaveBeenCalled();
      
      // Restore the original method
      jest.restoreAllMocks();
    });
  });

  describe('Indexes and Performance', () => {
    it('should have proper indexes defined', () => {
      const indexes = ChatMessageModel.schema.indexes();
      
      // Check if required indexes exist
      const indexFields = indexes.map(index => Object.keys(index[0]));
      
      expect(indexFields.some(fields => 
        fields.includes('gameId') && fields.includes('timestamp')
      )).toBe(true);
      
      expect(indexFields.some(fields => 
        fields.includes('sender')
      )).toBe(true);
      
      expect(indexFields.some(fields => 
        fields.includes('messageType')
      )).toBe(true);
      
      expect(indexFields.some(fields => 
        fields.includes('timestamp')
      )).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle validation with malformed data', () => {
      const malformedData = {
        gameId: { invalid: 'object' },
        sender: [],
        message: { not: 'a string' },
        messageType: 123,
        isRead: 'not a boolean'
      };
      
      const message = new ChatMessageModel(malformedData);
      const validation = message.validateSync();
      
      expect(validation).toBeDefined();
      expect(validation?.errors).toBeDefined();
    });

    it('should handle very long spam patterns', () => {
      const message = new ChatMessageModel(messageData);
      message.message = 'x'.repeat(1000);
      
      const isSpam = message.isSpam();
      
      // Should handle gracefully without throwing
      expect(typeof isSpam).toBe('boolean');
    });

    it('should handle regex patterns that could cause ReDoS', () => {
      const message = new ChatMessageModel(messageData);
      message.message = 'a'.repeat(50000); // Very long string
      
      const start = Date.now();
      const isSpam = message.isSpam();
      const end = Date.now();
      
      // Should complete in reasonable time (less than 1 second)
      expect(end - start).toBeLessThan(1000);
      expect(typeof isSpam).toBe('boolean');
    });
  });
});
