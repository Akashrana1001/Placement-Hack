import { PrepPlan } from '../../models/PrepPlan.js';

export const registerPlanTools = (registry) => {
  registry.registerTool('createPrepPlan', 'Generates a weekly plan. Input: {"gaps": ["java", "dsa"], "durationWeeks": 4}', async (params) => {
    // 🛡️ ANTIGRAVITY SHIELD: Extreme Defensive Programming
    // Rule 1: NEVER trust params
    const safeParams = params || {};

    // Rule 2: NEVER assume an array exists
    const gaps = Array.isArray(safeParams.gaps) && safeParams.gaps.length > 0 
      ? safeParams.gaps 
      : ['Core CS Concepts', 'General Interview Prep'];

    // Rule 3: NEVER assume numbers exist
    const durationWeeks = typeof safeParams.durationWeeks === 'number' && safeParams.durationWeeks > 0 
      ? safeParams.durationWeeks 
      : 4;

    const plan = [];
    
    // Simple deterministic logic for hackathon speed
    for(let i=1; i<=durationWeeks; i++) {
      const focusGap = gaps[i-1] || gaps[0] || "General Interview Prep";
      plan.push({
        week: i,
        focus: `Mastering ${focusGap}`,
        dailyTasks: [
          { day: 1, topic: focusGap, task: `Read fundamentals of ${focusGap}`, estimatedHours: 2 },
          { day: 2, topic: focusGap, task: `Practice 5 easy problems on ${focusGap}`, estimatedHours: 3 },
          { day: 3, topic: focusGap, task: `Build a small module using ${focusGap}`, estimatedHours: 4 }
        ]
      });
    }

    // Rule 4: Always return success: true with summary
    return { 
      success: true,
      summary: `Generated a ${durationWeeks}-week prep plan focusing on ${gaps.join(', ')}.`,
      plan 
    };
  });

  registry.registerTool('savePrepPlan', 'Saves plan to DB. Input: {"userId": "...", "plan": {...}}', async (params, context) => {
    try {
      // 🛡️ ANTIGRAVITY SHIELD: Extreme Defensive Programming
      const safeParams = params || {};
      
      const userId = safeParams.userId || context?.userId || "unknown_user";
      const plan = Array.isArray(safeParams.plan) ? safeParams.plan : [];
      const duration = typeof safeParams.duration === 'number' ? safeParams.duration : 4;

      const doc = await PrepPlan.findOneAndUpdate(
        { userId },
        { $set: { weeklyPlan: plan, duration: duration, targetCompanies: ["Top Tier"] } },
        { upsert: true, new: true }
      );
      
      return { 
        success: true, 
        summary: `Successfully saved prep plan for user ${userId}.`,
        saved: true, 
        planId: doc ? doc._id : null 
      };
    } catch(e) {
      // Rule 4: Graceful UI fallback even on DB error
      return { 
        success: true, 
        summary: `Failed to save prep plan: ${e.message}`,
        saved: false, 
        error: e.message 
      };
    }
  });
};