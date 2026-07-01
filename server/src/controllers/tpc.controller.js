import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Alert } from '../models/Alert.js';
import { Resume } from '../models/Resume.js';
import { PrepPlan } from '../models/PrepPlan.js';
import { MockInterview } from '../models/MockInterview.js';
import { AgentTrace } from '../models/AgentTrace.js';

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

export const getDashboard = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('name email department year riskScore skills')
      .sort({ riskScore: -1 })
      .lean();

    // Attach latest plan progress for the dashboard table
    const dashboardData = await Promise.all(students.map(async (student) => {
      const plan = await PrepPlan.findOne({ userId: student._id }).sort({ createdAt: -1 }).select('progress');
      return { ...student, planProgress: plan?.progress || null };
    }));

    res.status(200).json({ success: true, data: dashboardData });
  } catch (error) { next(error); }
};

export const getAlerts = async (req, res, next) => {
  try {
    const query = { acknowledged: false };
    // Allow-list validation to prevent NoSQL injection (e.g. ?severity[$ne]=null)
    if (req.query.severity && VALID_SEVERITIES.includes(req.query.severity)) {
      query.severity = req.query.severity;
    }

    const alerts = await Alert.find(query)
      .populate('studentId', 'name department')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: alerts });
  } catch (error) { next(error); }
};

export const acknowledgeAlert = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid alert ID.' });
    }
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true, acknowledgedBy: req.user._id },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    res.status(200).json({ success: true, data: alert });
  } catch (error) { next(error); }
};

export const getStudentDetail = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }
    const student = await User.findById(userId).select('-password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const resume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
    const plan = await PrepPlan.findOne({ userId }).sort({ createdAt: -1 });
    const interviews = await MockInterview.find({ userId }).sort({ createdAt: -1 }).limit(5);
    const traces = await AgentTrace.find({ userId }).sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: { student, resume, plan, interviews, traces }
    });
  } catch (error) { next(error); }
};

// ── GET /tpc/stats — aggregated platform numbers for the stats bar ──────────
export const getStats = async (req, res, next) => {
  try {
    const [totalStudents, totalInterviews, activeAlerts, atRiskStudents] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      MockInterview.countDocuments({}),
      Alert.countDocuments({ acknowledged: false }),
      User.countDocuments({ role: 'student', riskScore: { $gt: 60 } }),
    ]);
    res.status(200).json({
      success: true,
      data: { totalStudents, totalInterviews, activeAlerts, atRiskStudents }
    });
  } catch (error) { next(error); }
};