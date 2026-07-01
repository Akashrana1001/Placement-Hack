import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['risk', 'deadline', 'performance', 'opportunity'] },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  title: String,
  message: String,
  data: {
    riskScore: Number,
    triggerReason: String,
    recommendation: String
  },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

alertSchema.index({ severity: 1, acknowledged: 1 });
alertSchema.index({ createdAt: -1 });
// TTL Index: Auto-delete alerts after 14 days (14 * 24 * 60 * 60 = 1209600 seconds)
alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1209600 });

export const Alert = mongoose.model('Alert', alertSchema);