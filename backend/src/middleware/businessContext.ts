import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from './errorHandler';

export interface BusinessRequest extends Request {
  business?: {
    id: string;
    name: string;
    slug: string;
    whatsappNumber: string;
    whatsappAccessToken: string;
    whatsappPhoneId: string;
    paystackSecretKey: string | null;
    paystackPublicKey: string | null;
    ownerPhoneNumber: string | null;
    ownerNotifications: boolean;
    aiEscalationEnabled: boolean;
    plan: string;
    status: string;
  };
  user?: {
    id: string;
    email: string;
    role: string;
    businessId: string;
  };
}

/**
 * Middleware to identify business from WhatsApp webhook
 * Used for incoming WhatsApp messages
 */
export async function identifyBusinessFromWhatsApp(
  req: BusinessRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    // Extract phone number from WhatsApp webhook
    const webhookData = req.body;
    const phoneNumberId = webhookData?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (!phoneNumberId) {
      // If no phone number ID, this might be a verification request
      return next();
    }

    // Find business by WhatsApp Phone ID
    const business = await prisma.business.findFirst({
      where: { whatsappPhoneId: phoneNumberId },
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappNumber: true,
        whatsappAccessToken: true,
        whatsappPhoneId: true,
        paystackSecretKey: true,
        paystackPublicKey: true,
        ownerPhoneNumber: true,
        ownerNotifications: true,
        aiEscalationEnabled: true,
        plan: true,
        status: true,
      },
    });

    if (!business) {
      throw new AppError(404, 'Business not found for this WhatsApp number');
    }

    if (business.status !== 'ACTIVE') {
      throw new AppError(403, 'Business account is not active');
    }

    req.business = business;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to identify business from authenticated user
 * Used for API routes that require authentication
 */
export async function identifyBusinessFromUser(
  req: BusinessRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    // Super admins can access any business (handled separately)
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Get business from user's businessId
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappNumber: true,
        whatsappAccessToken: true,
        whatsappPhoneId: true,
        paystackSecretKey: true,
        paystackPublicKey: true,
        ownerPhoneNumber: true,
        ownerNotifications: true,
        aiEscalationEnabled: true,
        plan: true,
        status: true,
      },
    });

    if (!business) {
      throw new AppError(404, 'Business not found');
    }

    if (business.status !== 'ACTIVE') {
      throw new AppError(403, 'Business account is not active');
    }

    req.business = business;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to identify business from slug in request params or query
 * Used for public-facing or cross-business routes
 */
export async function identifyBusinessFromSlug(
  req: BusinessRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const slug = req.params.businessSlug || req.query.businessSlug;

    if (!slug) {
      throw new AppError(400, 'Business slug is required');
    }

    const business = await prisma.business.findUnique({
      where: { slug: slug as string },
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappNumber: true,
        whatsappAccessToken: true,
        whatsappPhoneId: true,
        paystackSecretKey: true,
        paystackPublicKey: true,
        ownerPhoneNumber: true,
        ownerNotifications: true,
        aiEscalationEnabled: true,
        plan: true,
        status: true,
      },
    });

    if (!business) {
      throw new AppError(404, 'Business not found');
    }

    req.business = business;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Utility to ensure business context exists
 */
export function requireBusiness(
  req: BusinessRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.business) {
    return next(new AppError(400, 'Business context is required'));
  }
  next();
}
