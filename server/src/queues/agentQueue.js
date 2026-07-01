/**
 * agentQueue.js
 * BullMQ Queue for async agent job processing.
 * Agent tasks are NEVER processed inline — they go through this queue
 * so the Express event loop is never blocked.
 */
import { Queue } from 'bullmq';
import { createRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// BullMQ requires its own dedicated Redis connection
const connection = createRedisClient();

export const agentQueue = new Queue('agent-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

agentQueue.on('error', (err) => {
  logger.error(`❌ Agent Queue error: ${err.message}`);
});

/**
 * Add an agent job to the queue.
 * @param {Object} data
 * @param {string} data.userId    — MongoDB user ID
 * @param {string} data.agentType — recon | strategy | arena | sentinel
 * @param {string} data.input     — the user input / data to process
 * @param {string} data.sessionId — Redis session key for short-term memory
 * @returns {import('bullmq').Job} — the created job (job.id is the jobId)
 */
export const addAgentJob = async (data) => {
  const { userId, agentType, input, sessionId } = data;

  const job = await agentQueue.add(
    `${agentType}-job`,  // job name
    { userId, agentType, input, sessionId },
  );

  logger.info(`📦 Agent job queued | jobId: ${job.id} | type: ${agentType} | user: ${userId}`);
  return job;
};
