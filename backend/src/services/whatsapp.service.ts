import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';

export interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g., +1234567890)
  body: string;
  mediaUrl?: string;
}

// WhatsApp Business API client
const whatsappClient = axios.create({
  baseURL: `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}`,
  headers: {
    'Authorization': `Bearer ${config.whatsapp.accessToken}`,
    'Content-Type': 'application/json',
  },
});

export async function sendTypingIndicator(to: string, action: 'typing' | 'stop_typing' = 'typing') {
  try {
    // Remove any 'whatsapp:' prefix and format phone number
    const phoneNumber = to.replace('whatsapp:', '').replace('+', '');

    await whatsappClient.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'typing',
      typing: {
        action: action
      }
    });

    console.log(`Typing indicator ${action} sent to ${phoneNumber}`);
  } catch (error: any) {
    console.error('Failed to send typing indicator:', error.response?.data || error.message);
    // Don't throw error for typing indicators - they're not critical
  }
}

export async function sendWhatsAppMessage(message: WhatsAppMessage) {
  try {
    // Remove any 'whatsapp:' prefix and format phone number
    const phoneNumber = message.to.replace('whatsapp:', '').replace('+', '');

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'text',
      text: {
        preview_url: true,
        body: message.body,
      },
    };

    // If media is provided, send as image message
    if (message.mediaUrl) {
      payload.type = 'image';
      payload.image = {
        link: message.mediaUrl,
        caption: message.body,
      };
      delete payload.text;
    }

    const response = await whatsappClient.post('/messages', payload);

    return {
      success: true,
      messageId: response.data.messages[0].id,
      status: 'sent',
    };
  } catch (error: any) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    throw new Error('Failed to send WhatsApp message');
  }
}

export async function sendProductDetails(to: string, product: any) {
  const message = `📦 *${product.name}*\n\n${product.description || 'No description available'}\n\n💰 Price: ${product.currency} ${product.price}\n📊 Stock: ${product.stock > 0 ? `${product.stock} available` : 'Out of stock'}\n\n${product.stock > 0 ? 'Reply with "buy" to purchase!' : 'We\'ll notify you when back in stock.'}`;

  await sendWhatsAppMessage({
    to,
    body: message,
    mediaUrl: product.imageUrl,
  });
}

export async function sendOrderConfirmation(to: string, order: any) {
  const items = order.items.map((item: any) =>
    `  • ${item.product.name} x${item.quantity} - ${order.currency} ${item.price}`
  ).join('\n');

  const message = `✅ *Order Confirmed!*\n\nOrder #${order.orderNumber}\n\n*Items:*\n${items}\n\n*Total:* ${order.currency} ${order.totalAmount}\n\nWe'll send you tracking information once your order ships!\n\nThank you for your purchase! 🎉`;

  await sendWhatsAppMessage({
    to,
    body: message,
  });
}

export async function sendPaymentLink(to: string, paymentUrl: string, amount: number, currency: string, provider: 'stripe' | 'paystack' = 'stripe') {
  const providerName = provider === 'paystack' ? 'Paystack' : 'Stripe';
  const message = `💳 *Complete Your Payment*\n\nAmount: ${currency} ${amount}\nPayment Provider: ${providerName}\n\nClick the link below to pay securely:\n${paymentUrl}\n\nThis link expires in 24 hours.`;

  await sendWhatsAppMessage({
    to,
    body: message,
  });
}

export async function sendOrderUpdate(to: string, orderNumber: string, status: string, trackingNumber?: string) {
  let message = `📦 *Order Update*\n\nOrder #${orderNumber}\nStatus: ${status}`;

  if (trackingNumber) {
    message += `\n\nTracking Number: ${trackingNumber}\n\nYou can track your package with this number.`;
  }

  await sendWhatsAppMessage({
    to,
    body: message,
  });
}

export async function notifyAgentHandoff(to: string, estimatedWaitTime?: string) {
  const message = `👋 Connecting you with our team...\n\n${estimatedWaitTime ? `Estimated wait time: ${estimatedWaitTime}` : 'An agent will be with you shortly.'}\n\nThank you for your patience!`;

  await sendWhatsAppMessage({
    to,
    body: message,
  });
}

// Webhook signature validation for WhatsApp Business API
export function validateWebhookSignature(signature: string, body: string): boolean {
  if (!config.whatsapp.appSecret) {
    console.warn('WhatsApp app secret not configured');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', config.whatsapp.appSecret)
      .update(body)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error('Webhook validation error:', error);
    return false;
  }
}

// Verify webhook endpoint (required by WhatsApp)
export function verifyWebhook(mode: string, token: string, challenge: string): string | null {
  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    return challenge;
  }
  return null;
}

// Parse incoming webhook message
export function parseWebhookMessage(webhookData: any): {
  from: string;
  messageId: string;
  body: string;
  name?: string;
  type: string;
} | null {
  try {
    const entry = webhookData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return null;

    return {
      from: message.from,
      messageId: message.id,
      body: message.text?.body || message.image?.caption || '',
      name: value?.contacts?.[0]?.profile?.name,
      type: message.type,
    };
  } catch (error) {
    console.error('Error parsing webhook message:', error);
    return null;
  }
}
