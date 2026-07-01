import mongoose from 'mongoose';

const mockInterviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['technical', 'hr', 'system-design'] },
  targetCompany: String,
  questions: [{
    question: String,
    topic: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    studentAnswer: String,
    evaluation: String,
    score: { type: Number, min: 0, max: 10 },
    feedback: String
  }],
  overallScore: Number,
  strengths: [String],
  weaknesses: [String],
  recommendation: String
}, { timestamps: true });

mockInterviewSchema.index({ userId: 1, createdAt: -1 });

export const MockInterview = mongoose.model('MockInterview', mockInterviewSchema);