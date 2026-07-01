import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User.js';
import { addAgentJob } from '../queues/agentQueue.js';
import { logger } from '../utils/logger.js';

export const startSentinelCron = () => {
  // Run every 30 minutes to conserve Groq TPM API limits for actual user traffic
  cron.schedule('*/30 * * * *', async () => {
    logger.info('👁️ SENTINEL CRON: Scanning for at-risk students...');
    try {
      // Find students who have a high risk score (over 60)
      const atRiskStudents = await User.find({ role: 'student', riskScore: { $gt: 60 } });

      if (atRiskStudents.length === 0) {
        logger.info('👁️ SENTINEL CRON: No at-risk students found.');
        return;
      }

      logger.info(`👁️ SENTINEL CRON: Found ${atRiskStudents.length} at-risk students. Dispatching Sentinel Agents...`);

      // Dispatch a Sentinel Agent job for each at-risk student into the BullMQ queue
      for (const student of atRiskStudents) {
        await addAgentJob({
          userId: student._id.toString(),
          agentType: 'sentinel',
          input: JSON.stringify({ command: 'CHECK_RISK', studentId: student._id.toString() }),
          sessionId: `sentinel-${uuidv4()}`
        });
      }
    } catch (error) {
      logger.error(`❌ SENTINEL CRON ERROR: ${error.message}`);
    }
  });

  logger.info('🕒 Sentinel Cron mounted. Will scan every 30 mins to conserve tokens.');
};
