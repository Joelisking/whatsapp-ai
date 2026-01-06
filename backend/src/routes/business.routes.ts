import { Router } from 'express';
import bcrypt from 'bcrypt';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * Create a new business (Super Admin only or public signup)
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      slug,
      whatsappNumber,
      whatsappAccessToken,
      whatsappPhoneId,
      paystackSecretKey,
      paystackPublicKey,
      ownerPhoneNumber,
      ownerEmail,
      ownerPassword,
      ownerName,
    } = req.body;

    // Validate required fields
    if (!name || !slug || !whatsappNumber || !whatsappAccessToken || !whatsappPhoneId) {
      throw new AppError(400, 'Missing required fields');
    }

    if (!ownerEmail || !ownerPassword || !ownerName) {
      throw new AppError(400, 'Owner information is required');
    }

    // Check if slug is already taken
    const existingBusiness = await prisma.business.findUnique({
      where: { slug },
    });

    if (existingBusiness) {
      throw new AppError(409, 'Business slug already exists');
    }

    // Check if WhatsApp number is already registered
    const existingWhatsApp = await prisma.business.findUnique({
      where: { whatsappNumber },
    });

    if (existingWhatsApp) {
      throw new AppError(409, 'WhatsApp number already registered');
    }

    // Hash owner password
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Create business and owner user in a transaction
    const business = await prisma.business.create({
      data: {
        name,
        slug,
        whatsappNumber,
        whatsappAccessToken,
        whatsappPhoneId,
        paystackSecretKey,
        paystackPublicKey,
        ownerPhoneNumber,
        plan: 'FREE',
        status: 'TRIAL',
        users: {
          create: {
            email: ownerEmail,
            password: hashedPassword,
            name: ownerName,
            role: 'ADMIN',
            phoneNumber: ownerPhoneNumber,
          },
        },
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Business created successfully',
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        plan: business.plan,
        status: business.status,
        owner: business.users[0],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all businesses (Super Admin only)
 */
router.get('/', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, plan } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const businesses = await prisma.business.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappNumber: true,
        plan: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.business.count({ where });

    res.json({
      businesses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get single business
 */
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
            users: true,
          },
        },
      },
    });

    if (!business) {
      throw new AppError(404, 'Business not found');
    }

    // Authorization: Super Admin or business owner/admin
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.businessId !== business.id) {
      throw new AppError(403, 'Access denied');
    }

    // Hide sensitive data
    const { whatsappAccessToken, paystackSecretKey, ...businessData } = business;

    res.json(businessData);
  } catch (error) {
    next(error);
  }
});

/**
 * Update business
 */
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      whatsappAccessToken,
      paystackSecretKey,
      paystackPublicKey,
      ownerPhoneNumber,
      ownerNotifications,
      aiEscalationEnabled,
      dailyPayoutTime,
    } = req.body;

    const business = await prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      throw new AppError(404, 'Business not found');
    }

    // Authorization
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.businessId !== business.id) {
      throw new AppError(403, 'Access denied');
    }

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(whatsappAccessToken && { whatsappAccessToken }),
        ...(paystackSecretKey && { paystackSecretKey }),
        ...(paystackPublicKey && { paystackPublicKey }),
        ...(ownerPhoneNumber !== undefined && { ownerPhoneNumber }),
        ...(ownerNotifications !== undefined && { ownerNotifications }),
        ...(aiEscalationEnabled !== undefined && { aiEscalationEnabled }),
        ...(dailyPayoutTime && { dailyPayoutTime }),
      },
    });

    // Hide sensitive data
    const { whatsappAccessToken: token, paystackSecretKey: key, ...businessData } = updatedBusiness;

    res.json(businessData);
  } catch (error) {
    next(error);
  }
});

/**
 * Update business status (Super Admin only)
 */
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED'].includes(status)) {
      throw new AppError(400, 'Invalid status');
    }

    const business = await prisma.business.update({
      where: { id },
      data: { status },
    });

    res.json({ message: 'Status updated', business });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete business (Super Admin only)
 */
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.business.delete({
      where: { id },
    });

    res.json({ message: 'Business deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
