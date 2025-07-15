import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';

// Import middleware
import { corsMiddleware, securityHeaders, customSecurity } from './middlewares/security.middleware';
import { generalRateLimit } from './middlewares/rateLimiting.middleware';
import { errorHandler, notFoundHandler, securityErrorHandler, databaseErrorHandler } from './middlewares/error.middleware';

// Import services
import { SchedulerService } from './services/scheduler.service';
import { EmailService } from './services/email.service';
import { SMSService } from './services/sms.service';

// Import config and database
import { config } from './config';
import { connectDB } from './config/database';


// Import passport config to register strategies
import './config/passport.config';

// Import routes
import appRoutes from './app.routes';

// Import socket manager
import { SocketManager } from './socket';

// Import logger
import { logError, logInfo, logWarn } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['NODE_ENV', 'PORT', 'MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logError(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize socket manager
let socketManager: SocketManager;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Disable X-Powered-By header
app.disable('x-powered-by');

// Security middleware (helmet for additional security headers)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Custom security middleware
app.use(securityHeaders);
app.use(customSecurity);
app.use(corsMiddleware);

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware with size limits and validation
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      // Only validate if the content type indicates JSON
      const contentType = req.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        JSON.parse(buf.toString());
      }
    } catch (e) {
      const error = new Error('Invalid JSON format');
      (error as any).status = 400;
      throw error;
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// Health check endpoint with enhanced information
app.get('/health', (req, res) => {
  try {
    const healthInfo = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      },
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };

    res.status(200).json(healthInfo);
  } catch (error) {
    logError(`Health check failed: ${error}`);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      message: 'Health check failed'
    });
  }
});

// Metrics endpoint (protected)
app.get('/metrics', (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      version: process.version,
      socketConnections: socketManager ? 'active' : 'inactive'
    };

    res.status(200).json(metrics);
  } catch (error) {
    logError(`Metrics endpoint failed: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve metrics'
    });
  }
});


// Serve static files for favicon and manifest
import path from 'path';
app.use(express.static(path.join(__dirname, 'public')));

// Root route for API information
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Tic Tac Toe API v1.0.0',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      game: '/api/game',
      chat: '/api/chat',
      metrics: '/metrics'
    },
    documentation: 'API endpoints available at /api'
  });
});

// API routes
app.use('/api', appRoutes);

// Error handling middleware (order matters!)
app.use(securityErrorHandler);
app.use(databaseErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.io connection handling with SocketManager
socketManager = new SocketManager(io);

// Initialize services
async function initializeServices() {
  try {
    // Connect to database
    await connectDB();
    logInfo('📄 Database connected successfully');

    // Initialize email service
    await EmailService.initialize();
    logInfo('📧 Email service initialized');

    // Initialize SMS service
    await SMSService.initialize();
    logInfo('📱 SMS service initialized');

    // Initialize scheduler service
    await SchedulerService.initialize();
    logInfo('⏰ Scheduler service initialized');

    // Start health monitoring
    startHealthMonitoring();

  } catch (error) {
    logError(`❌ Service initialization failed: ${error}`);
    throw error;
  }
}

// Health monitoring function
function startHealthMonitoring() {
  setInterval(() => {
    try {
      const memUsage = process.memoryUsage();
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      // Log memory usage if it's high
      if (memUsedMB > 500) {
        logWarn(`High memory usage detected: ${memUsedMB}MB`);
      }

      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        logError('Database connection lost, attempting to reconnect...');
        connectDB().catch(err => logError(`Database reconnection failed: ${err}`));
      }
    } catch (error) {
      logError(`Health monitoring error: ${error}`);
    }
  }, 60000); // Check every minute
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('🛑 SIGTERM received, shutting down gracefully');
  await gracefulShutdown();
});

process.on('SIGINT', async () => {
  logInfo('� SIGINT received, shutting down gracefully');
  await gracefulShutdown();
});

// Graceful shutdown function
async function gracefulShutdown() {
  try {
    // Stop accepting new connections
    server.close(async () => {
      logInfo('� HTTP server closed');
    });

    // Shutdown socket manager
    if (socketManager) {
      await socketManager.shutdown();
      logInfo('🔌 Socket manager shut down');
    }
    
    // Close database connection
    await mongoose.connection.close();
    logInfo('📄 Database connection closed');
    
    // Stop scheduler
    SchedulerService.shutdown();
    logInfo('⏰ Scheduler service stopped');
    
    process.exit(0);
  } catch (error) {
    logError(`Error during graceful shutdown: ${error}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error, promise) => {
  logError(`💥 Unhandled Promise Rejection at: ${promise}, reason: ${err.message}`);
  
  // Close server gracefully
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logError(`💥 Uncaught Exception: ${err.message}`);
  logError(`Stack: ${err.stack}`);
  
  // Perform emergency cleanup
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    const PORT = config.PORT;
    
    server.listen(PORT, () => {
      logInfo(`
🚀 Server is running!
📍 Port: ${PORT}
🌍 Environment: ${config.NODE_ENV}
🔗 Frontend URL: ${config.FRONTEND_URL}
⏰ Server started at: ${new Date().toISOString()}
      `);
    });
    
  } catch (error) {
    logError(`❌ Failed to start server: ${error}`);
    process.exit(1);
  }
}

// Export app for testing
export default app;

// Export io and socketManager for use in other modules
export { io, socketManager };

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}
