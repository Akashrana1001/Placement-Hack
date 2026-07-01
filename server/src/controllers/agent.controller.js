import { AgentTrace } from '../models/AgentTrace.js';
import { getStats } from '../services/cache.service.js';

export const getTrace = async (req, res, next) => {
  try {
    const trace = await AgentTrace.findOne({ jobId: req.params.jobId });
    if (!trace) return res.status(404).json({ success: false, message: "Trace not found" });
    res.status(200).json({ success: true, data: trace });
  } catch (error) { next(error); }
};

export const getUserTraces = async (req, res, next) => {
  try {
    // If TPC, they can query a specific user. Otherwise, lock to the logged-in user.
    const targetUserId = (req.user.role === 'tpc' && req.query.userId) 
      ? req.query.userId 
      : req.user._id;

    const traces = await AgentTrace.find({ userId: targetUserId })
      .select('jobId agentType status totalSteps totalLatencyMs cacheHits createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, data: traces });
  } catch (error) { next(error); }
};

export const getCacheStats = async (req, res, next) => {
  try {
    const stats = await getStats();
    const total = stats.hits + stats.misses;
    const ratio = total > 0 ? Math.round((stats.hits / total) * 100) : 0;
    
    res.status(200).json({ 
      success: true, 
      data: { hits: stats.hits, misses: stats.misses, ratio, totalCalls: total } 
    });
  } catch (error) { next(error); }
};