/**
 * AgentTrace.js
 * Mongoose model for storing complete agent execution traces.
 * Every ReAct loop run saves a trace here — every THINK/ACT/OBSERVE step is recorded.
 * TTL index auto-deletes traces older than 7 days.
 */
import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    thought: { type: String, default: '' },
    action: { type: String, default: null },
    actionInput: { type: mongoose.Schema.Types.Mixed, default: null },
    observation: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    latencyMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const agentTraceSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  agentType: {
    type: String,
    enum: ['recon', 'strategy', 'arena', 'sentinel'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running',
  },
  steps: [stepSchema],
  totalSteps: { type: Number, default: 0 },
  totalLatencyMs: { type: Number, default: 0 },
  cacheHits: { type: Number, default: 0 },
  cacheMisses: { type: Number, default: 0 },
  finalOutput: { type: mongoose.Schema.Types.Mixed, default: null },
  error: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Compound index for user queries sorted by date
agentTraceSchema.index({ userId: 1, createdAt: -1 });

// TTL index — auto-delete traces older than 7 days
agentTraceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const AgentTrace = mongoose.model('AgentTrace', agentTraceSchema);
