import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

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

// Import routes
import appRoutes from './app.routes';

// Import socket manager
import { SocketManager } from './socket';

// Load environment variables
dotenv.config();

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

// Security middleware
app.use(securityHeaders);
app.use(customSecurity);
app.use(corsMiddleware);

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV
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
    console.log('📄 Database connected successfully');

    // Initialize email service
    EmailService.initialize();
    console.log('📧 Email service initialized');

    // Initialize SMS service
    SMSService.initialize();
    console.log('📱 SMS service initialized');

    // Initialize scheduler service
    SchedulerService.initialize();
    console.log('⏰ Scheduler service initialized');

  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Shutdown socket manager first
  if (socketManager) {
    await socketManager.shutdown();
  }
  
  server.close(async () => {
    console.log('🔴 HTTP server closed');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('📄 Database connection closed');
    
    // Stop scheduler
    SchedulerService.shutdown();
    
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  // Shutdown socket manager first
  if (socketManager) {
    await socketManager.shutdown();
  }
  
  server.close(async () => {
    console.log('🔴 HTTP server closed');
    
    await mongoose.connection.close();
    console.log('📄 Database connection closed');
    
    SchedulerService.shutdown();
    
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('💥 Unhandled Promise Rejection:', err);
  
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    const PORT = config.PORT;
    
    server.listen(PORT, () => {
      console.log(`
🚀 Server is running!
📍 Port: ${PORT}
🌍 Environment: ${config.NODE_ENV}
🔗 Frontend URL: ${config.FRONTEND_URL}
⏰ Server started at: ${new Date().toISOString()}
      `);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
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
