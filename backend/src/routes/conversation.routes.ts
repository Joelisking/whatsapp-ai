import express from 'express';
import {
  getAllConversations,
  getConversationById,
  sendMessage,
  updateConversationStatus,
} from '../controllers/conversation.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getAllConversations);
router.get('/:id', authenticate, getConversationById);
router.post('/:id/messages', authenticate, authorize('ADMIN', 'AGENT'), sendMessage);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'AGENT'), updateConversationStatus);

export default router;
