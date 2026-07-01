import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { agentLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controllers/student.controller.js';
import * as interviewCtrl from '../controllers/interview.controller.js';
import { resumeUpload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('student'));

// Resume: text paste OR file upload — both feed the same analysis pipeline
router.post('/resume', agentLimiter, ctrl.uploadResume);
router.post('/resume/upload', agentLimiter, resumeUpload.single('resume'), ctrl.uploadResumeFile);
router.get('/analysis', ctrl.getAnalysis);
router.get('/plan', ctrl.getPlan);
router.post('/plan/generate', agentLimiter, ctrl.generatePlan);

// ⭐ NEW: Deterministic, instant interview endpoints (no LLM bottleneck)
router.post('/interview/start', interviewCtrl.startInterview);
router.post('/interview/evaluate', interviewCtrl.evaluateAnswer);
router.post('/interview/complete', interviewCtrl.completeInterview);
router.get('/interviews', interviewCtrl.getInterviews);

router.get('/progress', ctrl.getProgress);

export default router;