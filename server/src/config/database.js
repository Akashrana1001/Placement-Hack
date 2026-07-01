import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 3;
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ Error: ${error.message}`);
    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying connection in 5 seconds... (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => connectDB(retryCount + 1), 5000);
    } else {
      process.exit(1);
    }
  }
};  