import prisma from '../lib/prisma';
import { sendWhatsAppMessage } from './whatsapp.service';
import logger from '../utils/logger';

interface NotificationData {
  type: 'NEW_ORDER' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'ORDER_CANCELLED' | 'AI_ESCALATION' | 'DAILY_PAYOUT';
  title: string;
  message: string;
  metadata?: any;
}

export async function getOwnerPhoneNumber(): Promise<string | null> {
  try {
    // First, try to get from Settings table
    const settings = await prisma.settings.findFirst({
      where: { ownerNotifications: true },
      select: { ownerPhoneNumber: true }
    });

    if (settings?.ownerPhoneNumber) {
      return settings.ownerPhoneNumber;
    }

    // Fallback: get from first admin user
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        notifications: true,
        phoneNumber: { not: null }
      },
      select: { phoneNumber: true }
    });

    return admin?.phoneNumber || null;
  } catch (error) {
    logger.error('Error getting owner phone number:', error);
    return null;
  }
}

export async function isOwnerNotificationsEnabled(): Promise<boolean> {
  try {
    const settings = await prisma.settings.findFirst({
      select: { ownerNotifications: true }
    });

    return settings?.ownerNotifications ?? true;
  } catch (error) {
    logger.error('Error checking owner notifications setting:', error);
    return false;
  }
}

export async function notifyOwner(data: NotificationData): Promise<boolean> {
  try {
    // Check if notifications are enabled
    const isEnabled = await isOwnerNotificationsEnabled();
    if (!isEnabled) {
      logger.info('Owner notifications are disabled');
      return false;
    }

    // Get owner phone number
    const ownerPhone = await getOwnerPhoneNumber();
    if (!ownerPhone) {
      logger.warn('Owner phone number not configured');
      return false;
    }

    // Format the message
    const emoji = getEmojiForType(data.type);
    const formattedMessage = `${emoji} *${data.title}*\n\n${data.message}`;

    // Send WhatsApp message to owner
    await sendWhatsAppMessage({ to: ownerPhone, body: formattedMessage });

    logger.info(`Owner notification sent: ${data.type}`);
    return true;
  } catch (error) {
    logger.error('Error sending owner notification:', error);
    return false;
  }
}

export async function notifyNewOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      logger.error(`Order ${orderId} not found for notification`);
      return;
    }

    const itemsList = order.items
      .map((item: any) => `• ${item.product.name} x${item.quantity} - ${order.currency} ${item.price.toFixed(2)}`)
      .join('\n');

    const message = `*Order #${order.orderNumber}*\n\n` +
      `Customer: ${order.customer.name || order.customer.phoneNumber}\n` +
      `Total: ${order.currency} ${order.totalAmount.toFixed(2)}\n\n` +
      `Items:\n${itemsList}\n\n` +
      `Status: ${order.status}\n` +
      `Payment: ${order.paymentStatus}`;

    await notifyOwner({
      type: 'NEW_ORDER',
      title: 'New Order Received',
      message,
      metadata: { orderId: order.id, orderNumber: order.orderNumber }
    });
  } catch (error) {
    logger.error('Error notifying owner about new order:', error);
  }
}

export async function notifyPaymentSuccess(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) {
      logger.error(`Order ${orderId} not found for notification`);
      return;
    }

    const message = `*Payment Successful*\n\n` +
      `Order: #${order.orderNumber}\n` +
      `Customer: ${order.customer.name || order.customer.phoneNumber}\n` +
      `Amount: ${order.currency} ${order.totalAmount.toFixed(2)}\n` +
      `Status: ${order.status}`;

    await notifyOwner({
      type: 'PAYMENT_SUCCESS',
      title: 'Payment Confirmed',
      message,
      metadata: { orderId: order.id }
    });
  } catch (error) {
    logger.error('Error notifying owner about payment success:', error);
  }
}

export async function notifyPaymentFailed(orderId: string, reason?: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) {
      logger.error(`Order ${orderId} not found for notification`);
      return;
    }

    const message = `*Payment Failed*\n\n` +
      `Order: #${order.orderNumber}\n` +
      `Customer: ${order.customer.name || order.customer.phoneNumber}\n` +
      `Amount: ${order.currency} ${order.totalAmount.toFixed(2)}\n` +
      (reason ? `Reason: ${reason}\n` : '') +
      `\n⚠️ Action may be required`;

    await notifyOwner({
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      message,
      metadata: { orderId: order.id, reason }
    });
  } catch (error) {
    logger.error('Error notifying owner about payment failure:', error);
  }
}

export async function notifyAIEscalation(conversationId: string, customerMessage: string, reason: string): Promise<void> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true }
    });

    if (!conversation) {
      logger.error(`Conversation ${conversationId} not found for notification`);
      return;
    }

    const message = `*AI Needs Help*\n\n` +
      `Customer: ${conversation.customer.name || conversation.customer.phoneNumber}\n` +
      `Reason: ${reason}\n\n` +
      `Last message:\n"${customerMessage}"\n\n` +
      `Please check the conversation and respond directly.`;

    await notifyOwner({
      type: 'AI_ESCALATION',
      title: 'Customer Needs Assistance',
      message,
      metadata: { conversationId, customerId: conversation.customerId }
    });

    // Update conversation status
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'WAITING_FOR_OWNER' }
    });
  } catch (error) {
    logger.error('Error notifying owner about AI escalation:', error);
  }
}

function getEmojiForType(type: NotificationData['type']): string {
  const emojiMap: Record<NotificationData['type'], string> = {
    NEW_ORDER: '🛍️',
    PAYMENT_SUCCESS: '✅',
    PAYMENT_FAILED: '❌',
    ORDER_CANCELLED: '🚫',
    AI_ESCALATION: '🆘',
    DAILY_PAYOUT: '💰'
  };

  return emojiMap[type] || '📢';
}

export async function initializeSettings(): Promise<void> {
  try {
    const existingSettings = await prisma.settings.findFirst();

    if (!existingSettings) {
      await prisma.settings.create({
        data: {
          ownerNotifications: true,
          aiEscalationEnabled: true,
          dailyPayoutTime: '18:00',
        }
      });
      logger.info('Settings initialized');
    }
  } catch (error) {
    logger.error('Error initializing settings:', error);
  }
}
