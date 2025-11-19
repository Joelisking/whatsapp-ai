import express from 'express';
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getAllOrders);
router.get('/:id', authenticate, getOrderById);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'AGENT'), updateOrderStatus);
router.post('/:id/cancel', authenticate, authorize('ADMIN'), cancelOrder);

export default router;
