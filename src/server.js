import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { tradingInstanceManager } from './services/tradingInstanceManager.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) ||
           ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  }
});
const REQUIRED_PORT = 3587;
const REQUIRED_HOST = '127.0.0.1';
const PORT = process.env.PORT ? parseInt(process.env.PORT) : REQUIRED_PORT;
const HOST = process.env.HOST || REQUIRED_HOST;

// Enforce dedicated port requirement
if (PORT !== REQUIRED_PORT) {
  console.error(`❌ DayTradersPro server MUST run on port ${REQUIRED_PORT}`);
  console.error(`   Current configuration attempts to use port ${PORT}`);
  console.error(`   Please update your environment configuration or remove PORT override`);
  process.exit(1);
}

// Enforce localhost-only binding for security
if (HOST !== REQUIRED_HOST && HOST !== 'localhost') {
  console.error(`❌ DayTradersPro server MUST bind to localhost only (${REQUIRED_HOST})`);
  console.error(`   Current configuration attempts to bind to ${HOST}`);
  console.error(`   This is a security restriction to prevent remote administration`);
  console.error(`   Please remove HOST override or set it to ${REQUIRED_HOST}`);
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Ensure data directories exist
const ensureDirectories = async () => {
  const expandPath = (path) => {
    if (path.startsWith('~/')) {
      return join(process.env.HOME || process.env.USERPROFILE, path.slice(2));
    }
    return path;
  };

  const dirs = [
    expandPath(process.env.DATA_PATH || './data'),
    expandPath(process.env.ALGORITHMS_PATH || './data/algorithms'),
    expandPath(process.env.HISTORICAL_DATA_PATH || './data/historical')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error);
    }
  }
};

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send initial instance states
  socket.emit('instanceStates', tradingInstanceManager.getAllInstanceStates());

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Set up trading instance manager event forwarding
tradingInstanceManager.on('instanceStateChanged', (data) => {
  io.emit('instanceStateChanged', data);
});

tradingInstanceManager.on('instanceSignal', (data) => {
  io.emit('instanceSignal', data);
});

tradingInstanceManager.on('instanceLog', (data) => {
  io.emit('instanceLog', data);
});

tradingInstanceManager.on('instanceDataUpdate', (data) => {
  io.emit('instanceDataUpdate', data);
});

tradingInstanceManager.on('instanceCreated', (data) => {
  io.emit('instanceCreated', data);
});

tradingInstanceManager.on('instanceDeleted', (data) => {
  io.emit('instanceDeleted', data);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    tradingEngine: {
      instanceCount: tradingInstanceManager.getAllInstances().length,
      runningInstances: tradingInstanceManager.getAllInstances().filter(i => i.status === 'RUNNING').length
    }
  });
});

// Trading Engine API routes
app.use('/api/instances', (await import('./routes/instances.js')).default);
app.use('/api/trading', (await import('./routes/trading.js')).default);
app.use('/api/data', (await import('./routes/data.js')).default);

// Legacy API routes (for backward compatibility)
// Note: /api/auth removed - client should never handle Project X tokens
app.use('/api/algorithms', (await import('./routes/algorithms.js')).default);
app.use('/api/config', (await import('./routes/config.js')).default);
app.use('/api/historical', (await import('./routes/historical.js')).default);
app.use('/api/logs', (await import('./routes/logs.js')).default);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    await ensureDirectories();

    server.listen(PORT, HOST, (error) => {
      if (error) {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ FATAL: Port ${PORT} is already in use`);
          console.error(`   DayTradersPro requires exclusive access to port ${REQUIRED_PORT}`);
          console.error(`   Please stop any other services using this port and try again`);
          console.error(`   You can check what's using the port with: netstat -ano | findstr :${PORT}`);
        } else if (error.code === 'EADDRNOTAVAIL') {
          console.error(`❌ FATAL: Cannot bind to host ${HOST}`);
          console.error(`   Host address is not available on this system`);
        } else {
          console.error(`❌ FATAL: Failed to bind to ${HOST}:${PORT}:`, error.message);
        }
        process.exit(1);
      }

      console.log(`✅ DayTradersPro Server running on ${HOST}:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Security: Localhost-only binding (no remote access)`);
      console.log(`   WebSocket server enabled`);
      console.log(`   Trading engine initialized with ${tradingInstanceManager.getAllInstances().length} instances`);
      console.log(`   Server ready for client connections`);
    });

    // Handle server errors after startup
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ FATAL: Port ${PORT} became unavailable`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
      }
    });

  } catch (error) {
    console.error('❌ FATAL: Failed to start server:', error);
    process.exit(1);
  }
};

// Display startup banner
console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                    DayTradersPro Server                      ║');
console.log('║                   Trading Engine v1.0.0                      ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`🚀 Starting server on ${HOST}:${REQUIRED_PORT} (localhost-only)...`);

startServer();

export default app;
