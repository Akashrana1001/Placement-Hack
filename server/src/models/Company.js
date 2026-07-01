import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  industry: String,
  tier: { type: String, enum: ['dream', 'target', 'safe'], required: true, index: true },
  roles: [{
    title: String,
    requiredSkills: [String],
    preferredSkills: [String],
    minCGPA: Number,
    interviewRounds: [String]
  }],
  hiringPattern: {
    typicalMonths: [Number],
    avgCandidatesSelected: Number,
    selectionRate: Number // e.g., 0.05 for 5%
  }
}, { timestamps: true });

export const Company = mongoose.model('Company', companySchema);