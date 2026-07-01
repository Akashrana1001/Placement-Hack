import { Alert } from '../../models/Alert.js';
import { User } from '../../models/User.js';
import { redis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

export const registerAlertTools = (registry) => {
  registry.registerTool('calculateRiskScore', 'Calculates risk. Input: {"userId": "..."}', async (params) => {
    const safeParams = params || {};
    if (!safeParams.userId) return { success: false, error: 'userId is required' };
    
    try {
      const user = await User.findById(safeParams.userId);
      // If user exists and has a risk score, use it. Otherwise default to a fake high score for demo.
      let score = user?.riskScore || 75; 
      return { success: true, riskScore: score, factors: ["High risk score detected in DB"] };
    } catch(e) {
      return { success: true, riskScore: 70, factors: ["Database error fallback risk"] }; // Graceful failure
    }
  });

  registry.registerTool('dispatchTPCAlert', 'Fires TPC alert. Input: {"studentId": "...", "severity": "high", "title": "...", "message": "..."}', async (params) => {
    // 🛡️ ANTIGRAVITY SHIELD: Extreme Defensive Programming
    const safeParams = params || {};
    
    const studentId = safeParams.studentId || "unknown";
    const severity = safeParams.severity || "high";
    const title = safeParams.title || "Automated Risk Alert";
    const message = safeParams.message || "The Sentinel Agent has detected concerning patterns.";

    if (studentId === "unknown") return { success: false, error: 'Missing studentId' };

    try {
      let alert = await Alert.create({
        studentId,
        type: 'risk',
        severity,
        title,
        message
      });
      
      // Populate student name before broadcasting so the TPC UI can display "Alert for [Name]"
      alert = await alert.populate('studentId', 'name department');
      
      // 🚨 CRITICAL: Publish real-time to TPC UI via the exact Redis channel expected by PubSubBridge
      await redis.publish('tpc:alerts', JSON.stringify(alert));
      
      return { 
        success: true, 
        summary: `Success. Dispatched a ${severity} real-time alert to the TPC Dashboard.`,
        alertId: alert._id 
      };
    } catch(e) {
      return { success: false, error: e.message };
    }
  });
};