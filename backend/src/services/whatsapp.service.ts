import twilio from 'twilio';
import { config } from '../config';

const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

export interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g., +1234567890)
  body: string;
  mediaUrl?: string;
}

export async function sendWhatsAppMessage(message: WhatsAppMessage) {
  try {
    const formattedTo = message.to.startsWith('whatsapp:')
      ? message.to
      : `whatsapp:${message.to}`;

    const messageData: any = {
      from: config.twilio.whatsappNumber,
      to: formattedTo,
      body: message.body,
    };

    if (message.mediaUrl) {
      messageData.mediaUrl = [message.mediaUrl];
    }

    const result = await twilioClient.messages.create(messageData);

    return {
      success: true,
      messageId: result.sid,
      status: result.status,
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
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

export async function sendPaymentLink(to: string, paymentUrl: string, amount: number, currency: string) {
  const message = `💳 *Complete Your Payment*\n\nAmount: ${currency} ${amount}\n\nClick the link below to pay securely:\n${paymentUrl}\n\nThis link expires in 24 hours.`;

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

// Webhook validation
export function validateWebhookSignature(signature: string, url: string, params: any): boolean {
  if (!config.twilio.authToken) return false;
  return twilio.validateRequest(config.twilio.authToken, signature, url, params);
}
