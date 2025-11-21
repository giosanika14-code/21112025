import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { pool } from './config/database';
import { initializeWebSocket } from './websocket/socketManager';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import hotelRoutes from './routes/hotel';
import hotelExtendedRoutes from './routes/hotelExtended';
import staffRoutes from './routes/staff';
import chatRoutes from './routes/chat';

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

// Security middleware
app.use(helmet());

// CORS middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});

// =====================================================
// ROUTES
// =====================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
const API_VERSION = process.env.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/hotel`, hotelRoutes);
app.use(`/api/${API_VERSION}/hotel`, hotelExtendedRoutes);
app.use(`/api/${API_VERSION}/staff`, staffRoutes);
app.use(`/api/${API_VERSION}/chat`, chatRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Hospitality AI Assistant API',
    version: '1.0.0',
    description: 'Backend API for Hospitality AI SaaS Platform',
    endpoints: {
      health: '/health',
      auth: `/api/${API_VERSION}/auth`,
      admin: `/api/${API_VERSION}/admin`,
      hotel: `/api/${API_VERSION}/hotel`,
      staff: `/api/${API_VERSION}/staff`,
      chat: `/api/${API_VERSION}/chat`,
    },
  });
});

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// =====================================================
// SERVER INITIALIZATION
// =====================================================

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket
initializeWebSocket(httpServer);

// Test database connection before starting server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Start server
    httpServer.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
      console.log(`🔌 WebSocket URL: ws://localhost:${PORT}`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

// Start the server
startServer();

export default app;
