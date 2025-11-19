import express from 'express';
import { handlePaystackWebhook } from '../controllers/webhook.controller';

const router = express.Router();

// Paystack webhook endpoint
// This endpoint receives notifications from Paystack when payment events occur
// No authentication required as Paystack signs the requests
router.post('/paystack', handlePaystackWebhook);

export default router;
