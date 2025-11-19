import express from 'express';
import {
  getAllCustomers,
  getCustomerById,
  updateCustomer,
} from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getAllCustomers);
router.get('/:id', authenticate, getCustomerById);
router.patch('/:id', authenticate, updateCustomer);

export default router;
