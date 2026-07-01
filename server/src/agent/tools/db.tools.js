/**
 * db.tools.js
 * Consolidated student data query tool.
 * Pulls User profile + Resume + PrepPlan + MockInterviews in one call.
 */
import { User } from '../../models/User.js';
import { Resume } from '../../models/Resume.js';
import { PrepPlan } from '../../models/PrepPlan.js';
import { MockInterview } from '../../models/MockInterview.js';

export const registerDBTools = (registry) => {
  registry.registerTool(
    'queryStudentData',
    'Gets full student profile including resume, plan, and interview scores. Input: {"userId": "mongoObjectId"}',
    async (params) => {
      try {
        const userId = params?.userId;
        if (!userId) return { error: 'userId is required' };

        const [user, resume, plan, interviews] = await Promise.all([
          User.findById(userId).select('-password').lean(),
          Resume.findOne({ userId }).sort({ createdAt: -1 }).lean(),
          PrepPlan.findOne({ userId }).sort({ createdAt: -1 }).lean(),
          MockInterview.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
        ]);

        if (!user) return { error: 'User not found' };

        const avgScore = interviews.length > 0
          ? Math.round(interviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) / interviews.length)
          : null;

        return {
          user: { name: user.name, email: user.email, department: user.department, year: user.year, skills: user.skills, riskScore: user.riskScore },
          resume: resume ? { skills: resume.parsedData?.skills, gapReport: resume.gapReport, companyMatches: resume.companyMatches } : null,
          plan: plan ? { duration: plan.duration, progress: plan.progress, targetCompanies: plan.targetCompanies } : null,
          interviewStats: { count: interviews.length, avgScore },
        };
      } catch (err) {
        return { error: `DB query failed: ${err.message}` };
      }
    }
  );
};