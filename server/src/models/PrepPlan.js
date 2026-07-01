import mongoose from 'mongoose';

const prepPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  generatedBy: { type: String, default: 'strategy-agent' },
  targetCompanies: [String],
  duration: Number, // in weeks
  weeklyPlan: [{
    week: Number,
    focus: String,
    dailyTasks: [{
      day: Number,
      topic: String,
      task: String,
      resource: String,
      estimatedHours: Number,
      completed: { type: Boolean, default: false }
    }]
  }],
  progress: {
    tasksCompleted: { type: Number, default: 0 },
    totalTasks: Number,
    currentWeek: { type: Number, default: 1 }
  }
}, { timestamps: true });

export const PrepPlan = mongoose.model('PrepPlan', prepPlanSchema);