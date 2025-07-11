import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
}

export type LogLevel = 'INFO' | 'ERROR' | 'DEBUG' | 'WARN' | 'TRACE';

export class Logger {
  private static logDirectory = path.join(__dirname, '../../logs');
  private static logFilePath = path.join(this.logDirectory, 'application.log');
  private static errorLogPath = path.join(this.logDirectory, 'error.log');
  private static debugLogPath = path.join(this.logDirectory, 'debug.log');
  
  // In-memory log buffer for recent logs
  private static recentLogs: LogEntry[] = [];
  private static maxRecentLogs = 1000;
  
  // Rate limiting for log spam prevention
  private static logCounts: Map<string, { count: number; lastReset: number }> = new Map();
  private static maxLogsPerMinute = 100;

  static {
    this.initializeLogDirectory();
  }

  /**
   * Initialize log directory and files
   */
  private static initializeLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize log directory:', error);
    }
  }

  /**
   * Check rate limiting for log messages
   */
  private static isRateLimited(message: string): boolean {
    try {
      const now = Date.now();
      const key = message.substring(0, 50); // Use first 50 chars as key
      const entry = this.logCounts.get(key);

      if (!entry) {
        this.logCounts.set(key, { count: 1, lastReset: now });
        return false;
      }

      // Reset count if more than 1 minute has passed
      if (now - entry.lastReset > 60000) {
        entry.count = 1;
        entry.lastReset = now;
        return false;
      }

      entry.count++;
      return entry.count > this.maxLogsPerMinute;
    } catch (error) {
      return false; // Don't block logging on error
    }
  }

  /**
   * Sanitize log message to prevent injection attacks
   */
  private static sanitizeMessage(message: string): string {
    try {
      if (typeof message !== 'string') {
        message = String(message);
      }

      return message
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .substring(0, 1000); // Limit message length
    } catch (error) {
      return 'Message sanitization failed';
    }
  }

  /**
   * Core logging function with enhanced security and validation
   */
  private static writeLog(message: string, level: LogLevel, metadata?: Record<string, any>): void {
    try {
      const sanitizedMessage = this.sanitizeMessage(message);

      // Check rate limiting
      if (this.isRateLimited(sanitizedMessage)) {
        return; // Silently drop rate-limited logs
      }

      const timestamp = new Date();
      const logEntry: LogEntry = {
        timestamp,
        level,
        message: sanitizedMessage,
        metadata: metadata ? this.sanitizeMetadata(metadata) : undefined
      };

      // Add to recent logs buffer
      this.recentLogs.push(logEntry);
      if (this.recentLogs.length > this.maxRecentLogs) {
        this.recentLogs.shift();
      }

      // Format log message
      const formattedMessage = this.formatLogMessage(logEntry);

      // Write to appropriate files
      this.writeToFile(this.logFilePath, formattedMessage);

      if (level === 'ERROR') {
        this.writeToFile(this.errorLogPath, formattedMessage);
      }

      if (level === 'DEBUG') {
        this.writeToFile(this.debugLogPath, formattedMessage);
      }

      // Also log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(formattedMessage);
      }
    } catch (error) {
      // Fallback to console logging if file logging fails
      console.error('Logging failed:', error);
      console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
    }
  }

  /**
   * Sanitize metadata object
   */
  private static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    try {
      const sanitized: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(metadata)) {
        // Limit key length and sanitize
        const sanitizedKey = key.substring(0, 50).replace(/[^\w\-_]/g, '_');
        
        // Sanitize value based on type
        if (typeof value === 'string') {
          sanitized[sanitizedKey] = this.sanitizeMessage(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          sanitized[sanitizedKey] = value;
        } else if (value instanceof Date) {
          sanitized[sanitizedKey] = value.toISOString();
        } else if (value && typeof value === 'object') {
          sanitized[sanitizedKey] = JSON.stringify(value).substring(0, 500);
        } else {
          sanitized[sanitizedKey] = String(value).substring(0, 200);
        }
      }

      return sanitized;
    } catch (error) {
      return { error: 'Failed to sanitize metadata' };
    }
  }

  /**
   * Format log message for output
   */
  private static formatLogMessage(entry: LogEntry): string {
    try {
      const timestamp = entry.timestamp.toISOString();
      let formatted = `[${timestamp}] [${entry.level}] ${entry.message}`;
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        formatted += ` | ${JSON.stringify(entry.metadata)}`;
      }

      return formatted + '\n';
    } catch (error) {
      return `[${new Date().toISOString()}] [ERROR] Log formatting failed\n`;
    }
  }

  /**
   * Write to file with error handling
   */
  private static writeToFile(filePath: string, content: string): void {
    try {
      fs.appendFileSync(filePath, content);
    } catch (error) {
      console.error(`Failed to write to ${filePath}:`, error);
    }
  }

  /**
   * Public logging methods
   */
  static log(message: string, level: LogLevel = 'INFO', metadata?: Record<string, any>): void {
    this.writeLog(message, level, metadata);
  }

  static logInfo(message: string, metadata?: Record<string, any>): void {
    this.writeLog(message, 'INFO', metadata);
  }

  static logError(message: string, metadata?: Record<string, any>): void {
    this.writeLog(message, 'ERROR', metadata);
  }

  static logDebug(message: string, metadata?: Record<string, any>): void {
    this.writeLog(message, 'DEBUG', metadata);
  }

  static logWarn(message: string, metadata?: Record<string, any>): void {
    this.writeLog(message, 'WARN', metadata);
  }

  static logTrace(message: string, metadata?: Record<string, any>): void {
    this.writeLog(message, 'TRACE', metadata);
  }

  /**
   * Get recent logs for debugging
   */
  static getRecentLogs(level?: LogLevel, limit?: number): LogEntry[] {
    try {
      let logs = this.recentLogs;
      
      if (level) {
        logs = logs.filter(log => log.level === level);
      }

      if (limit && limit > 0) {
        logs = logs.slice(-limit);
      }

      return logs;
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return [];
    }
  }

  /**
   * Clear recent logs buffer
   */
  static clearRecentLogs(): void {
    this.recentLogs = [];
  }

  /**
   * Get log statistics
   */
  static getLogStats(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    oldestLogTime?: Date;
    newestLogTime?: Date;
  } {
    try {
      const stats: any = {
        totalLogs: this.recentLogs.length,
        logsByLevel: {
          INFO: 0,
          ERROR: 0,
          DEBUG: 0,
          WARN: 0,
          TRACE: 0
        }
      };

      if (this.recentLogs.length > 0) {
        stats.oldestLogTime = this.recentLogs[0].timestamp;
        stats.newestLogTime = this.recentLogs[this.recentLogs.length - 1].timestamp;

        for (const log of this.recentLogs) {
          stats.logsByLevel[log.level]++;
        }
      }

      return stats;
    } catch (error) {
      return {
        totalLogs: 0,
        logsByLevel: { INFO: 0, ERROR: 0, DEBUG: 0, WARN: 0, TRACE: 0 }
      };
    }
  }
}

// Export convenience functions for backward compatibility
export const log = (message: string, level: LogLevel = 'INFO') => Logger.log(message, level);
export const logInfo = (message: string) => Logger.logInfo(message);
export const logError = (message: string) => Logger.logError(message);
export const logDebug = (message: string) => Logger.logDebug(message);
export const logWarn = (message: string) => Logger.logWarn(message);
export const logTrace = (message: string) => Logger.logTrace(message);
