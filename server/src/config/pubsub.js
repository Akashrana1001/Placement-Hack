/**
 * pubsub.js
 * Redis Pub/Sub → Socket.io Bridge
 *
 * Creates a DEDICATED Redis subscriber that listens for agent step events
 * and forwards them to the correct Socket.io rooms in real-time.
 *
 * Channels:
 *   agent:stream:{jobId} → forwarded to Socket.io room {jobId}
 *   tpc:alerts            → forwarded to Socket.io room 'tpc'
 */
import { createRedisClient } from './redis.js';
import { getIO } from './socket.js';
import { logger } from '../utils/logger.js';

/**
 * Set up the Redis pub/sub → Socket.io bridge.
 * Must be called AFTER Socket.io is initialized.
 */
export const setupPubSubBridge = () => {
  // Subscribers can't be used for other Redis commands — need a dedicated client
  const subscriber = createRedisClient();

  // ── Subscribe to agent thought streams ──
  subscriber.psubscribe('agent:stream:*', (err) => {
    if (err) {
      logger.error(`❌ Failed to subscribe to agent:stream:* — ${err.message}`);
    } else {
      logger.info('🔗 Pub/Sub bridge: subscribed to agent:stream:*');
    }
  });

  // ── Subscribe to TPC alert channel ──
  subscriber.subscribe('tpc:alerts', (err) => {
    if (err) {
      logger.error(`❌ Failed to subscribe to tpc:alerts — ${err.message}`);
    } else {
      logger.info('🔗 Pub/Sub bridge: subscribed to tpc:alerts');
    }
  });

  // ── Handle incoming messages ──
  subscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const data = JSON.parse(message);
      const io = getIO();

      // channel format: "agent:stream:{jobId}"
      const jobId = channel.split(':').slice(2).join(':');

      if (jobId) {
        // Emit to all clients in the jobId room
        io.to(jobId).emit('agent:step', data);
      }
    } catch (err) {
      logger.warn(`⚠️ Pub/Sub bridge parse error: ${err.message}`);
    }
  });

  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);
      const io = getIO();

      if (channel === 'tpc:alerts') {
        io.to('tpc').emit('tpc:alerts', data);
        logger.info(`🚨 TPC alert forwarded via Socket.io`);
      }
    } catch (err) {
      logger.warn(`⚠️ Pub/Sub bridge parse error on ${channel}: ${err.message}`);
    }
  });

  subscriber.on('error', (err) => {
    logger.error(`❌ Pub/Sub subscriber error: ${err.message}`);
  });

  logger.info('✅ Redis Pub/Sub → Socket.io bridge active');
};
