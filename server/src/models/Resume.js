import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rawText: { type: String, required: true },
  parsedData: {
    education: [{ institution: String, degree: String, year: String, gpa: String }],
    experience: [{ company: String, role: String, duration: String, description: String }],
    skills: [{ 
      name: String, 
      category: { type: String, enum: ['technical', 'soft', 'tool'] }, 
      proficiency: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
    }],
    projects: [{ name: String, description: String, technologies: [String] }],
    certifications: [String]
  },
  gapReport: {
    strongAreas: [String],
    weakAreas: [String],
    criticalGaps: [String],
    recommendations: [String]
  },
  companyMatches: [{
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    companyName: String,
    matchScore: Number,
    matchedSkills: [String],
    missingSkills: [String]
  }]
}, { timestamps: true });

resumeSchema.index({ userId: 1, createdAt: -1 });

export const Resume = mongoose.model('Resume', resumeSchema);