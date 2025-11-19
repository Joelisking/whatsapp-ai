// Stripe service is currently not in use - using Paystack instead
// To enable Stripe, install the package: npm install stripe
// And add config.stripe.secretKey and config.stripe.webhookSecret to config/index.ts

/*
import Stripe from 'stripe';
import { config } from '../config';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-11-20.acacia',
});

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency.toLowerCase(),
      metadata: {
        orderId: params.orderId,
        ...params.metadata,
      },
      receipt_email: params.customerEmail,
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw new Error('Failed to create payment intent');
  }
}

export async function createPaymentLink(params: CreatePaymentIntentParams) {
  try {
    // Create line items for the payment
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: `Order ${params.orderId}`,
            },
            unit_amount: Math.round(params.amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: params.orderId,
        customerPhone: params.customerPhone || '',
        ...params.metadata,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${config.frontendUrl}/order/success?orderId=${params.orderId}`,
        },
      },
    });

    return {
      paymentLinkId: paymentLink.id,
      url: paymentLink.url,
    };
  } catch (error) {
    console.error('Stripe payment link error:', error);
    throw new Error('Failed to create payment link');
  }
}

export async function getPaymentStatus(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    console.error('Stripe get payment status error:', error);
    throw new Error('Failed to retrieve payment status');
  }
}

export async function refundPayment(paymentIntentId: string, amount?: number) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
    };
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw new Error('Failed to process refund');
  }
}

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  } catch (error) {
    console.error('Stripe webhook validation error:', error);
    throw new Error('Invalid webhook signature');
  }
}
*/

// Placeholder exports to avoid breaking imports
export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(_params: CreatePaymentIntentParams) {
  throw new Error('Stripe is not configured. Use Paystack instead.');
}

export async function createPaymentLink(_params: CreatePaymentIntentParams) {
  throw new Error('Stripe is not configured. Use Paystack instead.');
}

export async function getPaymentStatus(_paymentIntentId: string) {
  throw new Error('Stripe is not configured. Use Paystack instead.');
}

export async function refundPayment(_paymentIntentId: string, _amount?: number) {
  throw new Error('Stripe is not configured. Use Paystack instead.');
}

export function constructWebhookEvent(_payload: string | Buffer, _signature: string) {
  throw new Error('Stripe is not configured. Use Paystack instead.');
}
