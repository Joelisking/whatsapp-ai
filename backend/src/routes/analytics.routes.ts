import express from 'express';
import { getAnalytics } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN'), getAnalytics);

export default router;
