import { Server } from 'socket.io';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let io;

export const setupSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);
    
    socket.on('join:job', (jobId) => {
      socket.join(jobId);
      logger.info(`👤 Client ${socket.id} joined job room: ${jobId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};  