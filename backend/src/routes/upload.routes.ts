import express from 'express';
import { getProductImageUploadUrl } from '../controllers/upload.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Generate presigned URL for product image upload
// Only admins can upload product images
router.post('/product-image', authenticate, authorize('ADMIN'), getProductImageUploadUrl);

export default router;
