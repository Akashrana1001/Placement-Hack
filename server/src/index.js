import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

// Config & Utilities
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDB } from './config/database.js';
import { redis } from './config/redis.js';
import { setupSocket } from './config/socket.js';
import { setupPubSubBridge } from './config/pubsub.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { protect, authorize } from './middleware/auth.js';

// Routes & Dashboards
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import tpcRoutes from './routes/tpc.routes.js';
import agentRoutes from './routes/agent.routes.js';
import { bullBoardRouter } from './queues/bullBoard.js';
import { startSentinelCron } from './cron/sentinel.cron.js';

// Setup background worker directly in the same process for Render deployment
import './workers/agent.worker.js';

const app = express();
app.set('trust proxy', 1); // Trust Render load balancer to forward correct IP addresses for rate limiting
const httpServer = http.createServer(app);

// ==========================================
// 1. FOUNDATION MIDDLEWARE
// ==========================================
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// ==========================================
// 2. INITIALIZE SERVICES & REAL-TIME BRIDGES
// ==========================================
connectDB();
setupSocket(httpServer);
setupPubSubBridge();
startSentinelCron();

// ==========================================
// 3. GLOBAL RATE LIMITING
// ==========================================
app.use(generalLimiter);

// ==========================================
// 4. MOUNT ROUTES
// ==========================================
// BullMQ Dashboard — no auth needed, localhost only for hackathon demo
// In production you would add basic-auth or IP whitelist here
app.use('/admin/queues', bullBoardRouter);

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/tpc', tpcRoutes);
app.use('/api/agent', agentRoutes);

// Test Protected Route (Optional, for debugging)
app.get('/api/protected', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ==========================================
// 5. HEALTH CHECK
// ==========================================
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redis.status
  });
});

// ==========================================
// 6. GLOBAL ERROR HANDLING (Must be last)
// ==========================================
app.use(errorHandler);

// ==========================================
// 7. START SERVER
// ==========================================
httpServer.listen(env.PORT, () => {
  logger.info(`🚀 PlacementPilot Server running on port ${env.PORT}`);
});