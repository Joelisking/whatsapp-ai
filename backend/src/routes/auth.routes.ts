import express from 'express';
import { login, register, logout, getCurrentUser, updateSettings } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.post('/login', strictRateLimiter, login);
router.post('/register', strictRateLimiter, register);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);
router.put('/settings', authenticate, updateSettings);

export default router;
