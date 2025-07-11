import mongoose from 'mongoose';
import { config } from './index';
import { logInfo, logError, logWarn } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  const mongoURI = config.MONGO_URI;

  if (!mongoURI) {
    logError('MongoDB URI is not defined');
    throw new Error('MongoDB URI is not defined');
  }

  try {
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: config.PERFORMANCE.DATABASE_CONNECTION_TIMEOUT,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000,
    };

    if (process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
      options.auth = {
        username: process.env.MONGO_USERNAME,
        password: process.env.MONGO_PASSWORD,
      };
    }

    await mongoose.connect(mongoURI, options);
    logInfo('📄 MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      try {
        logError(`MongoDB connection error: ${String(err.message || err)}`);
      } catch (e) {
        logError(`Error in MongoDB error handler: ${e}`);
      }
    });

    mongoose.connection.on('disconnected', () => {
      try {
        logWarn('📄 MongoDB disconnected - attempting to reconnect...');
      } catch (e) {
        logError(`Error in MongoDB disconnected handler: ${e}`);
      }
    });

    mongoose.connection.on('reconnected', () => {
      try {
        logInfo('📄 MongoDB reconnected successfully');
      } catch (e) {
        logError(`Error in MongoDB reconnected handler: ${e}`);
      }
    });

    mongoose.connection.on('close', () => {
      try {
        logInfo('📄 MongoDB connection closed');
      } catch (e) {
        logError(`Error in MongoDB close handler: ${e}`);
      }
    });

    mongoose.connection.on('open', () => {
      try {
        logInfo('📄 MongoDB connection opened');
      } catch (e) {
        logError(`Error in MongoDB open handler: ${e}`);
      }
    });

    mongoose.set('strictQuery', true);
    mongoose.set('autoIndex', config.NODE_ENV !== 'production');
  } catch (err) {
    logError(`MongoDB connection failed: ${String(err)}`);
    throw err;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logInfo('📄 MongoDB disconnected successfully');
  } catch (err) {
    logError(`Error disconnecting from MongoDB: ${String(err)}`);
    throw err;
  }
};

export const getConnectionStatus = (): string => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[state as keyof typeof states] || 'unknown';
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export const checkDatabaseHealth = async (): Promise<{
  isHealthy: boolean;
  status: string;
  latency?: number;
}> => {
  try {
    if (!isDatabaseConnected()) {
      return {
        isHealthy: false,
        status: 'disconnected',
      };
    }

    const start = Date.now();
    const db = mongoose.connection.db;

    if (!db) {
      return {
        isHealthy: false,
        status: 'database_not_available',
      };
    }

    try {
      await db.admin().ping();
      const latency = Date.now() - start;

      return {
        isHealthy: true,
        status: 'connected',
        latency,
      };
    } catch (err) {
      logError(`Ping failed: ${String(err)}`);
      return {
        isHealthy: false,
        status: 'ping_failed',
      };
    }
  } catch (error) {
    logError(`Database health check failed: ${String(error)}`);
    return {
      isHealthy: false,
      status: 'error',
    };
  }
};
