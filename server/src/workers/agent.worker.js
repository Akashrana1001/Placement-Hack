import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { createRedisClient } from '../config/redis.js';
import { connectDB } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { ReActOrchestrator } from '../agent/orchestrator.js';
import { ToolRegistry } from '../agent/tools/registry.js';
import { addAgentJob } from '../queues/agentQueue.js';

// Models
import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { PrepPlan } from '../models/PrepPlan.js';
import { MockInterview } from '../models/MockInterview.js';

// Tools
import { registerResumeTools } from '../agent/tools/resume.tools.js';
import { registerCompanyTools } from '../agent/tools/company.tools.js';
import { registerPlanTools } from '../agent/tools/plan.tools.js';
import { registerInterviewTools } from '../agent/tools/interview.tools.js';
import { registerMemoryTools } from '../agent/tools/memory.tools.js';
import { registerDBTools } from '../agent/tools/db.tools.js';

// Prompts
import { getReconSystemPrompt } from '../agent/prompts/recon.prompt.js';
import { getStrategySystemPrompt } from '../agent/prompts/strategy.prompt.js';
import { getSentinelSystemPrompt } from '../agent/prompts/sentinel.prompt.js';
import { getArenaSystemPrompt } from '../agent/prompts/arena.prompt.js';

// Alert tools
import { registerAlertTools } from '../agent/tools/alert.tools.js';
import { registerRagTools } from '../agent/tools/rag.tools.js';

connectDB();
const connection = createRedisClient();

const worker = new Worker('agent-jobs', async (job) => {
  const { userId, agentType, input, sessionId } = job.data;
  logger.info(`👷 Worker processing Job ${job.id} | Agent: ${agentType}`);

  // ⭐ FIX: Safely convert String to ObjectId to prevent Mongoose CastErrors
  let userObjectId;
  try {
    userObjectId = new mongoose.Types.ObjectId(userId);
  } catch (e) {
    logger.error(`❌ Invalid userId "${userId}": ${e.message}`);
    throw new Error(`Invalid userId format: ${userId}`);
  }

  // Setup Tools & Config locally — each job gets a fresh registry
  const registry = new ToolRegistry();
  registerMemoryTools(registry);
  registerDBTools(registry);

  let systemPrompt = '';
  if (agentType === 'recon') {
    registerRagTools(registry);        // queryVectorStore — grounded context first
    registerResumeTools(registry);
    registerCompanyTools(registry);
    systemPrompt = getReconSystemPrompt(registry.getToolDescriptions());
  } else if (agentType === 'strategy') {
    registerPlanTools(registry);
    systemPrompt = getStrategySystemPrompt(registry.getToolDescriptions());
  } else if (agentType === 'sentinel') {
    registerAlertTools(registry);
    systemPrompt = getSentinelSystemPrompt(registry.getToolDescriptions());
  } else if (agentType === 'arena') {
    // ⭐ FIX: Added missing arena agent configuration
    registerInterviewTools(registry);
    systemPrompt = getArenaSystemPrompt(registry.getToolDescriptions());
  }

  const orchestrator = new ReActOrchestrator({
    agentType,
    systemPrompt,
    toolRegistry: registry,
    maxIterations: 8,  // Recon requires more steps to parse resume, browse web, and formulate structured JSON safely
    sessionId,
    userId: userObjectId.toString(),
    jobId: job.id
  });

  let result;
  try {
    result = await orchestrator.run(input);
  } catch (err) {
    logger.error(`❌ Agent Orchestrator Error [${agentType}]: ${err.message}`);
    throw err; // Let BullMQ handle retry/failure logic
  }

  // ⭐ FIX: Guard against orchestrator returning undefined/null
  if (!result || !result.finalAnswer) {
    logger.warn(`⚠️ Orchestrator returned no result for job ${job.id}`);
    return { finalAnswer: null, steps: 0 };
  }

  // ══════════════════════════════════════════════════════════════════
  // ⭐ DATA PERSISTENCE LAYER — Save agent output to Mongoose models
  // ══════════════════════════════════════════════════════════════════
  if (result.finalAnswer) {
    try {
      // Extract JSON from the finalAnswer string
      let data = null;
      try {
        // Find the FIRST valid complete JSON object
        const str = result.finalAnswer;
        let depth = 0;
        let start = -1;
        for (let i = 0; i < str.length; i++) {
          if (str[i] === '{') {
            if (depth === 0) start = i;
            depth++;
          } else if (str[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
              data = JSON.parse(str.slice(start, i + 1));
              break;
            }
          }
        }
      } catch (parseErr) {
        logger.error(`❌ JSON Parse Error: ${parseErr.message}`);
      }

      if (data) {

        // ── 1. RECON: Update the LATEST Resume document ──
        // DO NOT upsert — find the specific resume created by the controller
        if (agentType === 'recon') {
          const latestResume = await Resume.findOne({ userId: userObjectId }).sort({ createdAt: -1 });
          if (latestResume) {
            // ⭐ FIX: Map fields to match the Mongoose schema shape exactly
            latestResume.gapReport = {
              strongAreas: Array.isArray(data.strongAreas) ? data.strongAreas : [],
              weakAreas: Array.isArray(data.weakAreas) ? data.weakAreas : [],
              criticalGaps: Array.isArray(data.criticalGaps) ? data.criticalGaps : [],
              recommendations: Array.isArray(data.recommendations) ? data.recommendations : []
            };
            latestResume.companyMatches = Array.isArray(data.companyMatches)
              ? data.companyMatches.map(m => ({
                companyName: m?.companyName || 'Unknown',
                matchScore: typeof m?.matchScore === 'number' ? m.matchScore : 0,
                matchedSkills: Array.isArray(m?.matchedSkills) ? m.matchedSkills : [],
                missingSkills: Array.isArray(m?.missingSkills) ? m.missingSkills : []
              }))
              : [];
            await latestResume.save();
            logger.info(`💾 Saved Recon Analysis to Resume ${latestResume._id} for User ${userId}`);

            // ⭐ FIX: Compute dynamic Risk Score and update User model!
            const riskScoreRaw = (data.criticalGaps?.length || 0) * 20 + (data.weakAreas?.length || 0) * 10;
            const updatedRiskScore = Math.min(100, riskScoreRaw);
            await User.findByIdAndUpdate(userObjectId, { riskScore: updatedRiskScore });
            logger.info(`⚠️ Calculated Risk Score: ${updatedRiskScore} for User ${userId}`);

            // ⭐ FIX: Auto-chain Strategy Job!
            // Pass the extracted intelligence directly to the Strategy Agent's input payload
            const strategyPayload = JSON.stringify({
              weakAreas: data.weakAreas || [],
              criticalGaps: data.criticalGaps || [],
              companyMatches: data.companyMatches || [],
              recommendations: data.recommendations || []
            });

            const strategyJob = await addAgentJob({
              userId: userId,
              agentType: 'strategy',
              input: strategyPayload,
              sessionId: sessionId
            });
            logger.info(`🔗 Auto-chained Strategy Agent job for User ${userId}`);
            
            try {
              // Publish chaining event so the client switches to the new agent's stream
              await connection.publish(`agent:stream:${job.id}`, JSON.stringify({
                jobId: job.id,
                agentType: 'recon',
                action: 'CHAIN_AGENT',
                nextJobId: strategyJob.id,
                thought: 'Handing over to the Strategy Agent to create your Battle Plan...',
                isDone: false
              }));
            } catch (err) {
              logger.warn(`⚠️ Failed to publish CHAIN_AGENT to Redis: ${err.message}`);
            }

          } else {
            logger.warn(`⚠️ No resume document found to update for User ${userId}`);
          }
        }

        // ── 2. STRATEGY: Save to PrepPlan Model ──
        if (agentType === 'strategy') {
          const weeklyPlan = Array.isArray(data.weeklyPlan) ? data.weeklyPlan : [];
          const duration = typeof data.duration === 'number' ? data.duration : 4;
          const totalTasks = weeklyPlan.reduce((acc, w) => acc + (Array.isArray(w?.dailyTasks) ? w.dailyTasks.length : 0), 0);

          await PrepPlan.findOneAndUpdate(
            { userId: userObjectId },
            {
              $set: {
                weeklyPlan,
                duration,
                targetCompanies: Array.isArray(data.targetCompanies) ? data.targetCompanies : ['Top Tier'],
                progress: {
                  tasksCompleted: 0,
                  totalTasks,
                  currentWeek: 1
                }
              }
            },
            { upsert: true, new: true }
          );
          logger.info(`💾 Saved Strategy Plan for User ${userId}`);
        }

        // ── 3. SENTINEL: Log completion ──
        if (agentType === 'sentinel') {
          logger.info(`💾 Sentinel scan completed for User ${userId}`);
        }

        // ── 4. ARENA: Save to MockInterview Model ──
        if (agentType === 'arena') {
          // Verify it's the final summary format, not just an intermediate JSON piece
          if (typeof data.overallScore === 'number') {
            await MockInterview.create({
              userId: userObjectId,
              overallScore: data.overallScore,
              questions: Array.isArray(data.questions) ? data.questions : [],
              strengths: Array.isArray(data.strengths) ? data.strengths : [],
              weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
              recommendation: data.recommendation || ''
            });
            logger.info(`💾 Saved Mock Interview Summary for User ${userId}`);
          }
        }
      } else {
        logger.warn(`⚠️ No JSON found in finalAnswer for job ${job.id}`);
      }
    } catch (e) {
      logger.error(`❌ Data Persistence Error [${agentType}]: ${e.message}`);
    }
  }

  return result;
}, { connection, concurrency: 1 });
