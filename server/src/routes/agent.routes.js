import express from 'express';
import { protect } from '../middleware/auth.js';
import * as ctrl from '../controllers/agent.controller.js';

const router = express.Router();

router.use(protect); // Any logged-in user can access agent stats/traces

router.get('/trace/:jobId', ctrl.getTrace);
router.get('/traces', ctrl.getUserTraces);
router.get('/cache-stats', ctrl.getCacheStats);

export default router;