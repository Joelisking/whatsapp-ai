import express from 'express';
import { handleIncomingMessage, handleWebhookStatus } from '../controllers/chatbot.controller';

const router = express.Router();

// Twilio webhook for incoming messages
router.post('/', handleIncomingMessage);

// Twilio webhook for message status updates
router.post('/status', handleWebhookStatus);

export default router;
