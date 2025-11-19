import { Request, Response } from 'express';
import { validateWebhookSignature, verifyPayment } from '../services/paystack.service';
import { sendWhatsAppMessage } from '../services/whatsapp.service';
import { prisma } from '../config/database';

/**
 * Handle Paystack webhook events
 * This endpoint receives notifications from Paystack when payment events occur
 */
export async function handlePaystackWebhook(req: Request, res: Response) {
  try {
    // Verify webhook signature
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!signature || !validateWebhookSignature(signature, rawBody)) {
      console.error('Invalid Paystack webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('=== Paystack Webhook Event ===');
    console.log('Event:', event.event);
    console.log('Data:', JSON.stringify(event.data, null, 2));

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handlePaymentSuccess(event.data);
        break;

      case 'charge.failed':
        await handlePaymentFailed(event.data);
        break;

      case 'refund.processed':
        await handleRefundProcessed(event.data);
        break;

      default:
        console.log(`Unhandled Paystack event: ${event.event}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('=== Paystack Webhook Error ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(data: any) {
  try {
    const reference = data.reference;
    const orderId = data.metadata?.orderId;

    if (!orderId) {
      console.error('No orderId in payment metadata');
      return;
    }

    // Verify payment with Paystack
    const payment = await verifyPayment(reference);

    if (payment.status !== 'success') {
      console.error(`Payment verification failed. Status: ${payment.status}`);
      return;
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return;
    }

    // Update order status to CONFIRMED
    const existingMetadata = (order.metadata as Record<string, any>) || {};
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'SUCCEEDED',
        metadata: {
          ...existingMetadata,
          paidAt: payment.paidAt,
          paymentChannel: payment.channel,
          paymentVerifiedAt: new Date().toISOString(),
        },
      },
    });

    // Update product stock
    for (const item of order.items as any[]) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Send WhatsApp confirmation
    const itemsText = order.items
      .map((item) => `• ${item.quantity}x ${item.product.name} - ${order.currency} ${item.price * item.quantity}`)
      .join('\n');

    const confirmationMessage = `✅ *Payment Confirmed!*

Thank you for your payment! Your order has been confirmed.

*Order Details:*
Order #: ${order.orderNumber}
Total: ${order.currency} ${order.totalAmount}

*Items:*
${itemsText}

We'll process your order shortly and keep you updated on the delivery status.

Need help? Just send us a message!`;

    await sendWhatsAppMessage({
      to: order.customer.phoneNumber,
      body: confirmationMessage,
    });

    console.log(`✓ Order ${order.orderNumber} confirmed and customer notified`);
  } catch (error: any) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data: any) {
  try {
    const orderId = data.metadata?.orderId;

    if (!orderId) {
      console.error('No orderId in payment metadata');
      return;
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return;
    }

    // Update order status
    const existingMetadata = (order.metadata as Record<string, any>) || {};
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
        metadata: {
          ...existingMetadata,
          paymentFailedAt: new Date().toISOString(),
          failureReason: data.gateway_response || 'Payment failed',
        },
      },
    });

    // Notify customer
    const failureMessage = `❌ *Payment Failed*

Unfortunately, your payment for order #${order.orderNumber} could not be processed.

Reason: ${data.gateway_response || 'Payment declined'}

Don't worry! You can try again by sending me a message like "I want to order [product name]".

Need assistance? Feel free to ask!`;

    await sendWhatsAppMessage({
      to: order.customer.phoneNumber,
      body: failureMessage,
    });

    console.log(`Order ${order.orderNumber} marked as cancelled due to payment failure`);
  } catch (error: any) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

/**
 * Handle refund processed
 */
async function handleRefundProcessed(data: any) {
  try {
    const reference = data.transaction_reference;

    // Find the order by payment reference
    const order = await prisma.order.findFirst({
      where: { paymentIntentId: reference },
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
      console.error(`Order not found for reference: ${reference}`);
      return;
    }

    // Update order status
    const existingMetadata = (order.metadata as Record<string, any>) || {};
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        metadata: {
          ...existingMetadata,
          refundedAt: new Date().toISOString(),
          refundAmount: data.amount / 100,
        },
      },
    });

    // Restore product stock
    for (const item of order.items as any[]) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }

    // Notify customer
    const refundMessage = `💰 *Refund Processed*

Your refund for order #${order.orderNumber} has been processed successfully.

Amount: ${order.currency} ${data.amount / 100}

The funds will be returned to your original payment method within 5-10 business days.

If you have any questions, please let us know!`;

    await sendWhatsAppMessage({
      to: order.customer.phoneNumber,
      body: refundMessage,
    });

    console.log(`✓ Refund processed for order ${order.orderNumber}`);
  } catch (error: any) {
    console.error('Error handling refund:', error);
    throw error;
  }
}
