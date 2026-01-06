import axios from 'axios';

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface BusinessWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
}

/**
 * Create a WhatsApp client for a specific business
 */
export function createWhatsAppClient(config: BusinessWhatsAppConfig) {
  return axios.create({
    baseURL: `https://graph.facebook.com/v21.0/${config.phoneNumberId}`,
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Send typing indicator for a specific business
 */
export async function sendTypingIndicator(
  config: BusinessWhatsAppConfig,
  to: string
): Promise<void> {
  try {
    const client = createWhatsAppClient(config);
    const phoneNumber = to.replace('whatsapp:', '').replace('+', '');

    await client.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'text',
      text: {
        body: '...',
      },
    });

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  } catch (error: any) {
    console.log('Typing indicator not sent (optional):', error.message);
  }
}

/**
 * Send WhatsApp message for a specific business
 */
export async function sendWhatsAppMessage(
  config: BusinessWhatsAppConfig,
  message: WhatsAppMessage
) {
  try {
    const client = createWhatsAppClient(config);
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

    if (message.mediaUrl) {
      payload.type = 'image';
      payload.image = {
        link: message.mediaUrl,
        caption: message.body,
      };
      delete payload.text;
    }

    const response = await client.post('/messages', payload);

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

/**
 * Send product details
 */
export async function sendProductDetails(
  config: BusinessWhatsAppConfig,
  to: string,
  product: any
) {
  const message = `📦 *${product.name}*\n\n${product.description || 'No description available'}\n\n💰 Price: ${product.currency} ${product.price}\n📊 Stock: ${product.stock > 0 ? `${product.stock} available` : 'Out of stock'}\n\n${product.stock > 0 ? 'Reply with "buy" to purchase!' : 'We\'ll notify you when back in stock.'}`;

  await sendWhatsAppMessage(config, {
    to,
    body: message,
    mediaUrl: product.imageUrl,
  });
}

/**
 * Send order confirmation
 */
export async function sendOrderConfirmation(
  config: BusinessWhatsAppConfig,
  to: string,
  order: any
) {
  const items = order.items.map((item: any) =>
    `  • ${item.product.name} x${item.quantity} - ${order.currency} ${item.price}`
  ).join('\n');

  const message = `✅ *Order Confirmed!*\n\nOrder #${order.orderNumber}\n\n*Items:*\n${items}\n\n*Total:* ${order.currency} ${order.totalAmount}\n\nWe'll send you tracking information once your order ships!\n\nThank you for your purchase! 🎉`;

  await sendWhatsAppMessage(config, {
    to,
    body: message,
  });
}

/**
 * Send payment link
 */
export async function sendPaymentLink(
  config: BusinessWhatsAppConfig,
  to: string,
  paymentUrl: string,
  amount: number,
  currency: string,
  provider: 'stripe' | 'paystack' = 'paystack'
) {
  const providerName = provider === 'paystack' ? 'Paystack' : 'Stripe';
  const message = `💳 *Complete Your Payment*\n\nAmount: ${currency} ${amount}\nPayment Provider: ${providerName}\n\nClick the link below to pay securely:\n${paymentUrl}\n\nThis link expires in 24 hours.`;

  await sendWhatsAppMessage(config, {
    to,
    body: message,
  });
}

/**
 * Send order update
 */
export async function sendOrderUpdate(
  config: BusinessWhatsAppConfig,
  to: string,
  orderNumber: string,
  status: string,
  trackingNumber?: string
) {
  let message = `📦 *Order Update*\n\nOrder #${orderNumber}\nStatus: ${status}`;

  if (trackingNumber) {
    message += `\n\nTracking Number: ${trackingNumber}\n\nYou can track your package with this number.`;
  }

  await sendWhatsAppMessage(config, {
    to,
    body: message,
  });
}

/**
 * Parse incoming webhook message
 */
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
