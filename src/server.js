const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initializeFirebase } = require('./config/firebase');
const { logger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const schedulerService = require('./services/SchedulerService');

// Import routes
const webhookRoutes = require('./routes/webhook');
const propertyRoutes = require('./routes/properties');
const imageRoutes = require('./routes/images');
const userRoutes = require('./routes/users');
const agentRoutes = require('./routes/agents');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase
initializeFirebase();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Raw body parser for WhatsApp webhook verification
app.use('/webhook/whatsapp', express.raw({ type: 'application/json' }));

// JSON body parser for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Tenantsphere Lite',
    version: '1.0.0'
  });
});

// API Routes
app.use('/webhook', webhookRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agents', agentRoutes);

// API Documentation placeholder
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'API Documentation',
    endpoints: {
      health: 'GET /health',
      webhook: 'POST /webhook/whatsapp',
      properties: {
        list: 'GET /api/properties',
        create: 'POST /api/properties',
        get: 'GET /api/properties/:id',
        update: 'PUT /api/properties/:id',
        delete: 'DELETE /api/properties/:id'
      },
      users: {
        list: 'GET /api/users',
        create: 'POST /api/users',
        get: 'GET /api/users/:id',
        update: 'PUT /api/users/:id'
      },
      agents: {
        list: 'GET /api/agents',
        create: 'POST /api/agents',
        get: 'GET /api/agents/:id',
        update: 'PUT /api/agents/:id'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Tenantsphere Lite server running on port ${PORT}`);
  logger.info(`📱 WhatsApp webhook URL: ${process.env.APP_BASE_URL}/webhook/whatsapp`);
  logger.info(`📚 API documentation: ${process.env.APP_BASE_URL}/api/docs`);
  logger.info(`🏥 Health check: ${process.env.APP_BASE_URL}/health`);

  // Start scheduler service only if Firebase is available
  try {
    // Temporarily disable scheduler to fix startup issues
    // schedulerService.start();
    logger.info('📝 Scheduler service temporarily disabled for testing');
  } catch (error) {
    logger.warn('⚠️ Scheduler service not started - Firebase not available:', error.message);
    logger.info('💡 The server will run without background tasks. Configure Firebase to enable full functionality.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  schedulerService.stop();
  process.exit(0);
});

module.exports = app;
