import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const cacheGet = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Redis Get Error: ${err.message}`);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 3600) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.error(`Redis Set Error: ${err.message}`);
  }
};

export const cacheDelete = async (key) => {
  try {
    await redis.del(key);
  } catch (err) {
    logger.error(`Redis Del Error: ${err.message}`);
  }
};

export const incrementStat = async (key) => {
  try {
    await redis.incr(key);
  } catch (err) {
    logger.error(`Redis Incr Error: ${err.message}`);
  }
};

export const getStats = async () => {
  try {
    const hits = await redis.get('stats:cache:hits') || 0;
    const misses = await redis.get('stats:cache:misses') || 0;
    return { hits: parseInt(hits, 10), misses: parseInt(misses, 10) };
  } catch (err) {
    logger.error(`Redis getStats Error: ${err.message}`);
    return { hits: 0, misses: 0 };
  }
};  