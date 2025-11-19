import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { sendOrderUpdate, sendOrderConfirmation } from '../services/whatsapp.service';

export async function getAllOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, customerId, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.order.count({ where });

    res.json({ orders, total });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    if (!status) {
      throw new AppError(400, 'Status is required');
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        trackingNumber,
      },
      include: {
        customer: true,
      },
    });

    // Send WhatsApp notification
    await sendOrderUpdate(
      order.customer.phoneNumber,
      order.orderNumber,
      status,
      trackingNumber
    );

    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      throw new AppError(400, 'Cannot cancel order that has been shipped');
    }

    // Restore stock
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Send notification
    await sendOrderUpdate(
      order.customer.phoneNumber,
      order.orderNumber,
      'CANCELLED'
    );

    res.json({ order: updatedOrder });
  } catch (error) {
    next(error);
  }
}
