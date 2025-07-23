import mongoose from 'mongoose';
import { config } from './index';
import { logInfo, logError, logWarn } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  const mongoURI = config.MONGO_URI;

  if (!mongoURI) {
    logError('MongoDB URI is not defined');
    throw new Error('MongoDB URI is not defined');
  }

  // Multiple connection attempts with different configurations
  const connectionConfigs: Array<{
    name: string;
    uri: string;
    options: mongoose.ConnectOptions;
  }> = [
    {
      name: 'Primary Atlas Connection',
      uri: mongoURI,
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000, // Increased timeout
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000, // Added connect timeout
        bufferCommands: false,
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 10000,
        maxIdleTimeMS: 30000,
      }
    },
    {
      name: 'Atlas Connection with Extended Timeouts',
      uri: mongoURI.includes('?') 
        ? `${mongoURI}&connectTimeoutMS=30000&socketTimeoutMS=75000&serverSelectionTimeoutMS=30000`
        : `${mongoURI}?connectTimeoutMS=30000&socketTimeoutMS=75000&serverSelectionTimeoutMS=30000`,
      options: {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 75000,
        connectTimeoutMS: 30000,
        bufferCommands: false,
        retryWrites: true,
        retryReads: true,
      }
    }
  ];

  // If local MongoDB URI is configured, add it as fallback
  const localMongoURI = process.env.FALLBACK_MONGO_URI || 'mongodb://localhost:27017/tic-tac-toe';
  if (process.env.USE_LOCAL_FALLBACK === 'true') {
    connectionConfigs.push({
      name: 'Local MongoDB Fallback',
      uri: localMongoURI,
      options: {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
        connectTimeoutMS: 5000,
        bufferCommands: false,
        retryWrites: true,
        retryReads: true,
      }
    });
  }

  let lastError: Error | null = null;

  for (const connectionConfig of connectionConfigs) {
    try {
      logInfo(`🔄 Attempting ${connectionConfig.name}...`);
      
      // Create a copy of options to avoid modifying the original
      const connectOptions: mongoose.ConnectOptions = { ...connectionConfig.options };
      
      if (process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
        connectOptions.auth = {
          username: process.env.MONGO_USERNAME,
          password: process.env.MONGO_PASSWORD,
        };
      }

      await mongoose.connect(connectionConfig.uri, connectOptions);
      logInfo(`📄 MongoDB connected successfully using ${connectionConfig.name}`);
      
      // Set up connection event handlers
      setupConnectionHandlers();
      return;
      
    } catch (error) {
      lastError = error as Error;
      logWarn(`❌ ${connectionConfig.name} failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Disconnect any partial connections
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
    }
  }

  // If all connection attempts failed
  logError(`❌ All MongoDB connection attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
  throw lastError || new Error('Failed to connect to MongoDB');
};

const setupConnectionHandlers = () => {
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
