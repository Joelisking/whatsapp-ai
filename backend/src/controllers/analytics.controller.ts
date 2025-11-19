import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    // Total orders and revenue
    const ordersData = await prisma.order.aggregate({
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _count: true,
    });

    // Total customers
    const totalCustomers = await prisma.customer.count();

    // Active conversations
    const activeConversations = await prisma.conversation.count({
      where: {
        status: { in: ['ACTIVE', 'WAITING_FOR_AGENT', 'WITH_AGENT'] },
      },
    });

    // Popular products
    const popularProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    const productIds = popularProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    const popularProductsWithDetails = popularProducts.map((p) => ({
      product: products.find((prod) => prod.id === p.productId),
      totalQuantity: p._sum.quantity,
      orderCount: p._count,
    }));

    // Message statistics
    const messageStats = await prisma.message.groupBy({
      by: ['sender'],
      _count: true,
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
    });

    // Low stock products
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lte: 10 },
        isActive: true,
      },
      orderBy: {
        stock: 'asc',
      },
      take: 10,
    });

    res.json({
      orders: {
        total: ordersData._count,
        revenue: ordersData._sum.totalAmount || 0,
        byStatus: ordersByStatus,
      },
      customers: {
        total: totalCustomers,
      },
      conversations: {
        active: activeConversations,
      },
      messages: {
        byType: messageStats,
      },
      popularProducts: popularProductsWithDetails,
      lowStockProducts,
    });
  } catch (error) {
    next(error);
  }
}
