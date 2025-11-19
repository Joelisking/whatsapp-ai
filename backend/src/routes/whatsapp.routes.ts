import express from 'express';
import { handleIncomingMessage, handleWebhookStatus } from '../controllers/chatbot.controller';

const router = express.Router();

// WhatsApp Business API webhook verification (GET) and message handling (POST)
router.get('/', handleIncomingMessage); // Webhook verification
router.post('/', handleIncomingMessage); // Incoming messages

// WhatsApp message status updates
router.post('/status', handleWebhookStatus);

export default router;
