import axios from 'axios';
import { config } from '../config';
import prisma from '../lib/prisma';

interface NotificationMessage {
  type: 'NEW_ORDER' | 'ORDER_UPDATE' | 'AI_NEEDS_HELP' | 'LOW_STOCK' | 'NEW_CONVERSATION';
  data: any;
}

/**
 * Owner Notification Service
 * Sends WhatsApp notifications to store owners about important events
 */
class OwnerNotificationService {
  private whatsappApiUrl = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

  /**
   * Get all admin users with phone numbers configured
   */
  private async getAdminUsersWithPhoneNumbers() {
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          phoneNumber: {
            not: null
          }
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true
        }
      });

      return admins.filter(admin => admin.phoneNumber);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
  }

  /**
   * Send WhatsApp message to owner
   */
  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Format phone number (remove any + or spaces)
      const formattedPhone = phoneNumber.replace(/[+\s]/g, '');

      const response = await axios.post(
        this.whatsappApiUrl,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${config.whatsapp.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Owner notification sent to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send owner notification to ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Notify all owners about a new order
   */
  async notifyNewOrder(orderData: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    items: Array<{ productName: string; quantity: number; price: number }>;
    totalAmount: number;
    currency: string;
  }): Promise<void> {
    const admins = await this.getAdminUsersWithPhoneNumbers();

    if (admins.length === 0) {
      console.log('⚠️ No admin users with phone numbers configured for notifications');
      return;
    }

    // Build notification message
    const itemsList = orderData.items
      .map(item => `• ${item.productName} x${item.quantity} - ${orderData.currency} ${item.price.toFixed(2)}`)
      .join('\n');

    const message = `🎉 *NEW ORDER RECEIVED!*\n\n` +
      `📦 Order: #${orderData.orderNumber}\n\n` +
      `👤 Customer: ${orderData.customerName}\n` +
      `📱 Phone: ${orderData.customerPhone}\n\n` +
      `🛒 *Items:*\n${itemsList}\n\n` +
      `💰 *Total: ${orderData.currency} ${orderData.totalAmount.toFixed(2)}*\n\n` +
      `⏳ Waiting for payment confirmation...`;

    // Send to all admins
    for (const admin of admins) {
      await this.sendWhatsAppMessage(admin.phoneNumber!, message);
    }
  }

  /**
   * Notify owners about order updates
   */
  async notifyOrderUpdate(orderData: {
    orderNumber: string;
    customerName: string;
    status: string;
    previousStatus?: string;
  }): Promise<void> {
    const admins = await this.getAdminUsersWithPhoneNumbers();

    if (admins.length === 0) return;

    const statusEmoji = {
      CONFIRMED: '✅',
      PROCESSING: '⚙️',
      SHIPPED: '🚚',
      DELIVERED: '📦',
      CANCELLED: '❌',
      REFUNDED: '💸'
    };

    const emoji = statusEmoji[orderData.status as keyof typeof statusEmoji] || '📋';

    const message = `${emoji} *ORDER STATUS UPDATE*\n\n` +
      `📦 Order: #${orderData.orderNumber}\n` +
      `👤 Customer: ${orderData.customerName}\n\n` +
      `Status: ${orderData.status}`;

    for (const admin of admins) {
      await this.sendWhatsAppMessage(admin.phoneNumber!, message);
    }
  }

  /**
   * Notify owners when AI needs help
   */
  async notifyAINeedsHelp(data: {
    customerName: string;
    customerPhone: string;
    conversationId: string;
    lastMessage: string;
    reason: string;
  }): Promise<void> {
    const admins = await this.getAdminUsersWithPhoneNumbers();

    if (admins.length === 0) {
      console.log('⚠️ No admin users with phone numbers configured for AI handoff notifications');
      return;
    }

    const message = `🆘 *AI NEEDS YOUR HELP!*\n\n` +
      `👤 Customer: ${data.customerName}\n` +
      `📱 Phone: ${data.customerPhone}\n\n` +
      `💬 Last message:\n"${data.lastMessage}"\n\n` +
      `❓ Reason: ${data.reason}\n\n` +
      `👉 Please check your dashboard to take over this conversation.\n\n` +
      `🔗 Conversation ID: ${data.conversationId}`;

    for (const admin of admins) {
      await this.sendWhatsAppMessage(admin.phoneNumber!, message);
    }
  }

  /**
   * Notify owners about low stock
   */
  async notifyLowStock(productData: {
    productName: string;
    currentStock: number;
    threshold?: number;
  }): Promise<void> {
    const admins = await this.getAdminUsersWithPhoneNumbers();

    if (admins.length === 0) return;

    const message = `⚠️ *LOW STOCK ALERT*\n\n` +
      `📦 Product: ${productData.productName}\n` +
      `📊 Current Stock: ${productData.currentStock}\n\n` +
      `Please restock soon to avoid running out!`;

    for (const admin of admins) {
      await this.sendWhatsAppMessage(admin.phoneNumber!, message);
    }
  }

  /**
   * Notify owners about new conversations
   */
  async notifyNewConversation(data: {
    customerName: string;
    customerPhone: string;
    firstMessage: string;
  }): Promise<void> {
    const admins = await this.getAdminUsersWithPhoneNumbers();

    if (admins.length === 0) return;

    const message = `💬 *NEW CUSTOMER CONVERSATION*\n\n` +
      `👤 Customer: ${data.customerName}\n` +
      `📱 Phone: ${data.customerPhone}\n\n` +
      `First message:\n"${data.firstMessage}"`;

    for (const admin of admins) {
      await this.sendWhatsAppMessage(admin.phoneNumber!, message);
    }
  }

  /**
   * Send a custom message to all owners
   */
  async sendCustomMessage(message: string): Promise<void> {
    const admins = await this.getAdminUsersWithPhoneNumbers();

    for (const admin of admins) {
      await this.sendWhatsAppMessage(admin.phoneNumber!, message);
    }
  }
}

export const ownerNotificationService = new OwnerNotificationService();
