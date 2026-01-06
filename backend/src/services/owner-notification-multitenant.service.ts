import prisma from '../lib/prisma';
import { sendWhatsAppMessage } from './whatsapp-multitenant.service';
import logger from '../utils/logger';

interface NotificationData {
  type: 'NEW_ORDER' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'ORDER_CANCELLED' | 'AI_ESCALATION' | 'DAILY_PAYOUT';
  title: string;
  message: string;
  metadata?: any;
}

export async function notifyOwner(businessId: string, data: NotificationData): Promise<boolean> {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        ownerPhoneNumber: true,
        ownerNotifications: true,
        whatsappAccessToken: true,
        whatsappPhoneId: true,
      },
    });

    if (!business?.ownerNotifications || !business.ownerPhoneNumber) {
      logger.info('Owner notifications disabled or no phone number');
      return false;
    }

    const emoji = getEmojiForType(data.type);
    const formattedMessage = `${emoji} *${data.title}*\n\n${data.message}`;

    const config = {
      accessToken: business.whatsappAccessToken,
      phoneNumberId: business.whatsappPhoneId,
    };

    await sendWhatsAppMessage(config, {
      to: business.ownerPhoneNumber,
      body: formattedMessage,
    });

    logger.info(`Owner notification sent for business ${businessId}: ${data.type}`);
    return true;
  } catch (error) {
    logger.error('Error sending owner notification:', error);
    return false;
  }
}

export async function notifyNewOrder(businessId: string, orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      logger.error(`Order ${orderId} not found`);
      return;
    }

    const itemsList = order.items
      .map((item: any) => `• ${item.product.name} x${item.quantity} - ${order.currency} ${item.price.toFixed(2)}`)
      .join('\n');

    const message =
      `*Order #${order.orderNumber}*\n\n` +
      `Customer: ${order.customer.name || order.customer.phoneNumber}\n` +
      `Total: ${order.currency} ${order.totalAmount.toFixed(2)}\n\n` +
      `Items:\n${itemsList}\n\n` +
      `Status: ${order.status}\n` +
      `Payment: ${order.paymentStatus}`;

    await notifyOwner(businessId, {
      type: 'NEW_ORDER',
      title: 'New Order Received',
      message,
      metadata: { orderId, orderNumber: order.orderNumber },
    });
  } catch (error) {
    logger.error('Error notifying new order:', error);
  }
}

export async function notifyPaymentSuccess(businessId: string, orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) return;

    const message =
      `*Payment Successful*\n\n` +
      `Order: #${order.orderNumber}\n` +
      `Customer: ${order.customer.name || order.customer.phoneNumber}\n` +
      `Amount: ${order.currency} ${order.totalAmount.toFixed(2)}`;

    await notifyOwner(businessId, {
      type: 'PAYMENT_SUCCESS',
      title: 'Payment Confirmed',
      message,
    });
  } catch (error) {
    logger.error('Error notifying payment success:', error);
  }
}

export async function notifyPaymentFailed(businessId: string, orderId: string, reason?: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) return;

    const message =
      `*Payment Failed*\n\n` +
      `Order: #${order.orderNumber}\n` +
      `Customer: ${order.customer.name || order.customer.phoneNumber}\n` +
      `Amount: ${order.currency} ${order.totalAmount.toFixed(2)}\n` +
      (reason ? `Reason: ${reason}\n` : '') +
      `\n⚠️ Action may be required`;

    await notifyOwner(businessId, {
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      message,
    });
  } catch (error) {
    logger.error('Error notifying payment failed:', error);
  }
}

export async function notifyAIEscalation(businessId: string, conversationId: string, customerMessage: string, reason: string): Promise<void> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true },
    });

    if (!conversation) return;

    const message =
      `*AI Needs Help*\n\n` +
      `Customer: ${conversation.customer.name || conversation.customer.phoneNumber}\n` +
      `Reason: ${reason}\n\n` +
      `Last message:\n"${customerMessage}"\n\n` +
      `Please check and respond.`;

    await notifyOwner(businessId, {
      type: 'AI_ESCALATION',
      title: 'Customer Needs Assistance',
      message,
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'WAITING_FOR_OWNER' },
    });
  } catch (error) {
    logger.error('Error notifying AI escalation:', error);
  }
}

function getEmojiForType(type: NotificationData['type']): string {
  const emojiMap: Record<NotificationData['type'], string> = {
    NEW_ORDER: '🛍️',
    PAYMENT_SUCCESS: '✅',
    PAYMENT_FAILED: '❌',
    ORDER_CANCELLED: '🚫',
    AI_ESCALATION: '🆘',
    DAILY_PAYOUT: '💰',
  };
  return emojiMap[type] || '📢';
}
