import prisma from '../lib/prisma';
import { notifyOwner } from './owner-notification.service';
import logger from '../utils/logger';

interface DailyPayoutSummary {
  date: string;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  totalRevenue: number;
  currency: string;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export async function calculateDailyPayout(date?: Date): Promise<DailyPayoutSummary> {
  const targetDate = date || new Date();

  // Set to start of day
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  // Set to end of day
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all orders for the day
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Calculate totals
  const totalOrders = orders.length;
  const successfulOrders = orders.filter((o: any) => o.paymentStatus === 'SUCCEEDED').length;
  const failedOrders = orders.filter((o: any) => o.paymentStatus === 'FAILED').length;

  // Calculate revenue (only from successful payments)
  const successfulOrdersList = orders.filter((o: any) => o.paymentStatus === 'SUCCEEDED');
  const totalRevenue = successfulOrdersList.reduce((sum: number, order: any) => sum + order.totalAmount, 0);

  // Determine most common currency
  const currencyCounts = orders.reduce((acc: any, order: any) => {
    acc[order.currency] = (acc[order.currency] || 0) + 1;
    return acc;
  }, {});
  const currency = Object.keys(currencyCounts).length > 0
    ? Object.keys(currencyCounts).reduce((a, b) => currencyCounts[a] > currencyCounts[b] ? a : b)
    : 'USD';

  // Calculate top products
  const productStats: { [key: string]: { name: string; quantity: number; revenue: number } } = {};

  successfulOrdersList.forEach((order: any) => {
    order.items.forEach((item: any) => {
      const productId = item.productId;
      if (!productStats[productId]) {
        productStats[productId] = {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };
      }
      productStats[productId].quantity += item.quantity;
      productStats[productId].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(p => ({
      productName: p.name,
      quantity: p.quantity,
      revenue: p.revenue,
    }));

  return {
    date: targetDate.toISOString().split('T')[0],
    totalOrders,
    successfulOrders,
    failedOrders,
    totalRevenue,
    currency,
    topProducts,
  };
}

export async function sendDailyPayoutNotification(): Promise<void> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const summary = await calculateDailyPayout(yesterday);

    if (summary.totalOrders === 0) {
      logger.info('No orders for yesterday, skipping payout notification');
      return;
    }

    // Format the message
    const topProductsText = summary.topProducts.length > 0
      ? summary.topProducts
          .map((p, i) => `${i + 1}. ${p.productName} - ${p.quantity} units (${summary.currency} ${p.revenue.toFixed(2)})`)
          .join('\n')
      : 'No products sold';

    const message = `*Daily Sales Report*\n` +
      `Date: ${summary.date}\n\n` +
      `📊 *Summary*\n` +
      `Total Orders: ${summary.totalOrders}\n` +
      `✅ Successful: ${summary.successfulOrders}\n` +
      `❌ Failed: ${summary.failedOrders}\n\n` +
      `💰 *Revenue*\n` +
      `Total: ${summary.currency} ${summary.totalRevenue.toFixed(2)}\n\n` +
      `🏆 *Top Products*\n${topProductsText}\n\n` +
      `Keep up the great work!`;

    await notifyOwner({
      type: 'DAILY_PAYOUT',
      title: 'Daily Sales Report',
      message,
      metadata: summary,
    });

    logger.info('Daily payout notification sent successfully');
  } catch (error) {
    logger.error('Error sending daily payout notification:', error);
    throw error;
  }
}

export async function getPayoutSummary(startDate: Date, endDate: Date): Promise<any> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        paymentStatus: 'SUCCEEDED',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.totalAmount, 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalRevenue,
      orderCount,
      averageOrderValue,
      orders: orders.map((o: any) => ({
        orderNumber: o.orderNumber,
        totalAmount: o.totalAmount,
        currency: o.currency,
        createdAt: o.createdAt,
        customer: {
          name: o.customer.name,
          phoneNumber: o.customer.phoneNumber,
        },
      })),
    };
  } catch (error) {
    logger.error('Error getting payout summary:', error);
    throw error;
  }
}
