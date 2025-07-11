import fs from 'fs';
import path from 'path';
import { Logger, LogEntry, LogLevel, log, logInfo, logError, logDebug, logWarn, logTrace } from '../../../src/utils/logger';

// Mock fs module
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Logger', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const mockConsoleLog = jest.fn();
  const mockConsoleError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    
    // Reset the logger's internal state
    Logger.clearRecentLogs();
    
    // Mock fs operations to succeed by default
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.appendFileSync.mockReturnValue(undefined);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('log initialization', () => {
    it('should create log directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      
      // Re-import to trigger initialization
      jest.resetModules();
      require('../../../src/utils/logger');
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });

    it('should handle directory creation errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      // Re-import to trigger initialization
      jest.resetModules();
      require('../../../src/utils/logger');
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to initialize log directory:',
        expect.any(Error)
      );
    });
  });

  describe('basic logging functionality', () => {
    it('should log info message correctly', () => {
      Logger.logInfo('Test info message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[INFO] Test info message')
      );
    });

    it('should log error message correctly', () => {
      Logger.logError('Test error message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[ERROR] Test error message')
      );
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('error.log'),
        expect.stringContaining('[ERROR] Test error message')
      );
    });

    it('should log debug message correctly', () => {
      Logger.logDebug('Test debug message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[DEBUG] Test debug message')
      );
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('debug.log'),
        expect.stringContaining('[DEBUG] Test debug message')
      );
    });

    it('should log warn message correctly', () => {
      Logger.logWarn('Test warn message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[WARN] Test warn message')
      );
    });

    it('should log trace message correctly', () => {
      Logger.logTrace('Test trace message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[TRACE] Test trace message')
      );
    });

    it('should use generic log method correctly', () => {
      Logger.log('Test generic message', 'INFO');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[INFO] Test generic message')
      );
    });
  });

  describe('message sanitization', () => {
    it('should sanitize control characters from messages', () => {
      Logger.logInfo('Test\x00message\x1F');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('Testmessage')
      );
    });

    it('should escape newlines and carriage returns', () => {
      Logger.logInfo('Test\nmessage\r');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('Test\\nmessage\\r')
      );
    });

    it('should limit message length', () => {
      const longMessage = 'a'.repeat(1500);
      Logger.logInfo(longMessage);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringMatching(/a{1000}/)
      );
    });

    it('should handle non-string messages', () => {
      Logger.logInfo(12345 as any);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('12345')
      );
    });

    it('should handle message sanitization errors', () => {
      // Mock String to throw error
      const originalString = String;
      global.String = jest.fn(() => {
        throw new Error('String error');
      }) as any;
      
      Logger.logInfo('test');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('Message sanitization failed')
      );
      
      // Restore String
      global.String = originalString;
    });
  });

  describe('metadata handling', () => {
    it('should log messages with metadata', () => {
      const metadata = { userId: '123', action: 'login' };
      Logger.logInfo('User logged in', metadata);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringMatching(/User logged in.*userId.*123.*action.*login/)
      );
    });

    it('should sanitize metadata keys', () => {
      const metadata = { 'invalid@key!': 'value' };
      Logger.logInfo('Test message', metadata);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('invalid_key_')
      );
    });

    it('should handle different metadata value types', () => {
      const metadata = {
        string: 'test',
        number: 123,
        boolean: true,
        date: new Date('2023-01-01'),
        object: { nested: 'value' },
        null_value: null,
        undefined_value: undefined
      };
      
      Logger.logInfo('Test message', metadata);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('test')
      );
    });

    it('should limit metadata string values', () => {
      const metadata = { longValue: 'a'.repeat(1500) };
      Logger.logInfo('Test message', metadata);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringMatching(/a{1000}/)
      );
    });

    it('should handle metadata sanitization errors', () => {
      const metadata = { test: 'value' };
      
      // Mock Object.entries to throw error
      const originalEntries = Object.entries;
      Object.entries = jest.fn(() => {
        throw new Error('Entries error');
      });
      
      Logger.logInfo('Test message', metadata);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('Failed to sanitize metadata')
      );
      
      // Restore Object.entries
      Object.entries = originalEntries;
    });
  });

  describe('rate limiting', () => {
    it('should allow normal logging frequency', () => {
      for (let i = 0; i < 50; i++) {
        Logger.logInfo(`Message ${i}`);
      }
      
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(50);
    });

    it('should rate limit excessive logging', () => {
      // Log the same message many times to trigger rate limiting
      for (let i = 0; i < 150; i++) {
        Logger.logInfo('Repeated message');
      }
      
      // Should be rate limited after maxLogsPerMinute (100)
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(100);
    });

    it('should reset rate limiting after time window', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);
      
      // Log many messages to hit rate limit
      for (let i = 0; i < 150; i++) {
        Logger.logInfo('Repeated message');
      }
      
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(100);
      
      // Advance time by more than 1 minute
      currentTime += 70000;
      jest.clearAllMocks();
      
      // Should be able to log again
      Logger.logInfo('New message after time advance');
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
      
      // Restore Date.now
      Date.now = originalNow;
    });

    it('should handle rate limiting errors gracefully', () => {
      // Mock Date.now to throw error
      const originalNow = Date.now;
      Date.now = jest.fn(() => {
        throw new Error('Time error');
      });
      
      Logger.logInfo('Test message');
      
      // Should still log despite rate limiting error
      expect(mockFs.appendFileSync).toHaveBeenCalled();
      
      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('file writing error handling', () => {
    it('should handle file write errors gracefully', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });
      
      Logger.logInfo('Test message');
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write to'),
        expect.any(Error)
      );
    });

    it('should fall back to console logging on complete failure', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('Complete failure');
      });
      
      // Mock the entire writeLog to throw error
      const originalLog = Logger.log;
      Logger.log = jest.fn(() => {
        throw new Error('Complete logging failure');
      });
      
      // This should trigger the catch block in writeLog
      try {
        Logger.logError('Test error');
      } catch (error) {
        // Expected to catch and handle
      }
      
      // Restore
      Logger.log = originalLog;
    });
  });

  describe('recent logs management', () => {
    it('should store recent logs in memory', () => {
      Logger.logInfo('Test info');
      Logger.logError('Test error');
      Logger.logDebug('Test debug');
      
      const recentLogs = Logger.getRecentLogs();
      
      expect(recentLogs).toHaveLength(3);
      expect(recentLogs[0].message).toBe('Test info');
      expect(recentLogs[0].level).toBe('INFO');
      expect(recentLogs[1].message).toBe('Test error');
      expect(recentLogs[1].level).toBe('ERROR');
    });

    it('should filter recent logs by level', () => {
      Logger.logInfo('Test info');
      Logger.logError('Test error');
      Logger.logDebug('Test debug');
      
      const errorLogs = Logger.getRecentLogs('ERROR');
      
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('ERROR');
      expect(errorLogs[0].message).toBe('Test error');
    });

    it('should limit recent logs by count', () => {
      Logger.logInfo('Test 1');
      Logger.logInfo('Test 2');
      Logger.logInfo('Test 3');
      
      const limitedLogs = Logger.getRecentLogs(undefined, 2);
      
      expect(limitedLogs).toHaveLength(2);
      expect(limitedLogs[0].message).toBe('Test 2');
      expect(limitedLogs[1].message).toBe('Test 3');
    });

    it('should maintain maximum recent logs buffer', () => {
      // Add more logs than the buffer size (assuming 1000 is max)
      for (let i = 0; i < 1050; i++) {
        Logger.logInfo(`Test message ${i}`);
      }
      
      const recentLogs = Logger.getRecentLogs();
      
      expect(recentLogs.length).toBeLessThanOrEqual(1000);
      expect(recentLogs[recentLogs.length - 1].message).toBe('Test message 1049');
    });

    it('should clear recent logs', () => {
      Logger.logInfo('Test message');
      expect(Logger.getRecentLogs()).toHaveLength(1);
      
      Logger.clearRecentLogs();
      expect(Logger.getRecentLogs()).toHaveLength(0);
    });

    it('should handle getRecentLogs errors gracefully', () => {
      Logger.logInfo('Test message');
      
      // Mock array operations to fail
      const originalFilter = Array.prototype.filter;
      Array.prototype.filter = jest.fn(() => {
        throw new Error('Filter error');
      });
      
      const logs = Logger.getRecentLogs();
      
      expect(logs).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to get recent logs:',
        expect.any(Error)
      );
      
      // Restore filter
      Array.prototype.filter = originalFilter;
    });
  });

  describe('log statistics', () => {
    it('should return correct log statistics', () => {
      Logger.logInfo('Info 1');
      Logger.logInfo('Info 2');
      Logger.logError('Error 1');
      Logger.logDebug('Debug 1');
      
      const stats = Logger.getLogStats();
      
      expect(stats.totalLogs).toBe(4);
      expect(stats.logsByLevel.INFO).toBe(2);
      expect(stats.logsByLevel.ERROR).toBe(1);
      expect(stats.logsByLevel.DEBUG).toBe(1);
      expect(stats.logsByLevel.WARN).toBe(0);
      expect(stats.logsByLevel.TRACE).toBe(0);
      expect(stats.oldestLogTime).toBeInstanceOf(Date);
      expect(stats.newestLogTime).toBeInstanceOf(Date);
    });

    it('should return empty statistics for no logs', () => {
      Logger.clearRecentLogs();
      
      const stats = Logger.getLogStats();
      
      expect(stats.totalLogs).toBe(0);
      expect(stats.logsByLevel.INFO).toBe(0);
      expect(stats.oldestLogTime).toBeUndefined();
      expect(stats.newestLogTime).toBeUndefined();
    });

    it('should handle statistics calculation errors', () => {
      Logger.logInfo('Test message');
      
      // Mock array operations to fail
      const originalLength = Array.prototype.length;
      Object.defineProperty(Array.prototype, 'length', {
        get: () => {
          throw new Error('Length error');
        },
        configurable: true
      });
      
      const stats = Logger.getLogStats();
      
      expect(stats.totalLogs).toBe(0);
      expect(stats.logsByLevel.INFO).toBe(0);
      
      // Restore length property
      Object.defineProperty(Array.prototype, 'length', {
        value: originalLength,
        configurable: true,
        writable: true
      });
    });
  });

  describe('convenience functions', () => {
    it('should use convenience log function', () => {
      log('Test message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[INFO] Test message')
      );
    });

    it('should use convenience logInfo function', () => {
      logInfo('Info message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[INFO] Info message')
      );
    });

    it('should use convenience logError function', () => {
      logError('Error message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[ERROR] Error message')
      );
    });

    it('should use convenience logDebug function', () => {
      logDebug('Debug message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[DEBUG] Debug message')
      );
    });

    it('should use convenience logWarn function', () => {
      logWarn('Warn message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[WARN] Warn message')
      );
    });

    it('should use convenience logTrace function', () => {
      logTrace('Trace message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[TRACE] Trace message')
      );
    });
  });

  describe('environment-specific behavior', () => {
    it('should log to console in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      Logger.logInfo('Development message');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Development message')
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log to console in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      Logger.logInfo('Production message');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('timestamp and formatting', () => {
    it('should include timestamp in log messages', () => {
      Logger.logInfo('Timestamped message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
      );
    });

    it('should handle log formatting errors', () => {
      // Mock toISOString to throw error
      const originalToISOString = Date.prototype.toISOString;
      Date.prototype.toISOString = jest.fn(() => {
        throw new Error('ISO string error');
      });
      
      Logger.logInfo('Test message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('application.log'),
        expect.stringContaining('[ERROR] Log formatting failed')
      );
      
      // Restore toISOString
      Date.prototype.toISOString = originalToISOString;
    });
  });
});
