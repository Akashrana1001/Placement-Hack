import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/tpc.controller.js';

const router = express.Router();

router.use(protect);
router.use(authorize('tpc'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/alerts', ctrl.getAlerts);
router.get('/stats', ctrl.getStats);
router.patch('/alerts/:id/ack', ctrl.acknowledgeAlert);
router.get('/student/:id', ctrl.getStudentDetail);

export default router;