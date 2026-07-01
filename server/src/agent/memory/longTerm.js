/**
 * longTerm.js
 * MongoDB-backed long-term agent memory.
 * Stores and retrieves full agent execution traces.
 */
import { AgentTrace } from '../../models/AgentTrace.js';
import { logger } from '../../utils/logger.js';

/**
 * Save a complete agent trace to MongoDB.
 * @param {Object} traceData — matches AgentTrace schema shape
 * @returns {Object} — the saved Mongoose document
 */
export const saveAgentTrace = async (traceData) => {
  try {
    const trace = await AgentTrace.create(traceData);
    logger.info(`📝 Agent trace saved | jobId: ${trace.jobId} | type: ${trace.agentType} | steps: ${trace.totalSteps}`);
    return trace;
  } catch (err) {
    logger.error(`❌ Failed to save agent trace: ${err.message}`);
    // Don't throw — trace storage failure shouldn't kill the agent
    return null;
  }
};

/**
 * Get recent traces for a user, sorted newest first.
 * @param {string} userId
 * @param {number} limit
 */
export const getTracesByUser = async (userId, limit = 10) => {
  try {
    return await AgentTrace.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    logger.error(`❌ Failed to get traces for user ${userId}: ${err.message}`);
    return [];
  }
};

/**
 * Get a single trace by its BullMQ jobId.
 * @param {string} jobId
 */
export const getTraceByJobId = async (jobId) => {
  try {
    return await AgentTrace.findOne({ jobId }).lean();
  } catch (err) {
    logger.error(`❌ Failed to get trace for job ${jobId}: ${err.message}`);
    return null;
  }
};

/**
 * Update a running trace (e.g. add steps incrementally, change status).
 * @param {string} jobId
 * @param {Object} updateData — Mongoose update object
 */
export const updateTrace = async (jobId, updateData) => {
  try {
    return await AgentTrace.findOneAndUpdate({ jobId }, updateData, { new: true });
  } catch (err) {
    logger.error(`❌ Failed to update trace ${jobId}: ${err.message}`);
    return null;
  }
};
