import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';

const paystackClient = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    'Authorization': `Bearer ${config.paystack.secretKey}`,
    'Content-Type': 'application/json',
  },
});

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone?: string;
  orderId: string;
  metadata?: Record<string, string>;
}

export async function initializePayment(params: CreatePaymentParams) {
  try {
    const response = await paystackClient.post('/transaction/initialize', {
      amount: Math.round(params.amount * 100), // Paystack uses kobo/pesewas (smallest currency unit)
      currency: params.currency.toUpperCase(),
      email: params.customerEmail || 'customer@example.com',
      reference: `${params.orderId}-${Date.now()}`,
      callback_url: `${config.frontendUrl}/order/success?orderId=${params.orderId}`,
      metadata: {
        orderId: params.orderId,
        customerPhone: params.customerPhone || '',
        ...params.metadata,
      },
      channels: ['card', 'bank', 'mobile_money', 'ussd'],
    });

    return {
      reference: response.data.data.reference,
      authorizationUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
    };
  } catch (error: any) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    throw new Error('Failed to initialize Paystack payment');
  }
}

export async function verifyPayment(reference: string) {
  try {
    const response = await paystackClient.get(`/transaction/verify/${reference}`);

    return {
      status: response.data.data.status,
      amount: response.data.data.amount / 100,
      currency: response.data.data.currency,
      reference: response.data.data.reference,
      paidAt: response.data.data.paid_at,
      channel: response.data.data.channel,
    };
  } catch (error: any) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    throw new Error('Failed to verify Paystack payment');
  }
}

export async function refundPayment(reference: string, amount?: number) {
  try {
    const payload: any = {
      transaction: reference,
    };

    if (amount) {
      payload.amount = Math.round(amount * 100);
    }

    const response = await paystackClient.post('/refund', payload);

    return {
      refundId: response.data.data.id,
      status: response.data.data.status,
      amount: response.data.data.amount / 100,
      reference: response.data.data.transaction_reference,
    };
  } catch (error: any) {
    console.error('Paystack refund error:', error.response?.data || error.message);
    throw new Error('Failed to process Paystack refund');
  }
}

export function validateWebhookSignature(signature: string, body: string): boolean {
  if (!config.paystack.secretKey) {
    console.warn('Paystack secret key not configured');
    return false;
  }

  try {
    const hash = crypto
      .createHmac('sha512', config.paystack.secretKey)
      .update(body)
      .digest('hex');

    return hash === signature;
  } catch (error) {
    console.error('Paystack webhook validation error:', error);
    return false;
  }
}

// Get payment status
export async function getPaymentStatus(reference: string) {
  try {
    const payment = await verifyPayment(reference);
    return {
      status: payment.status === 'success' ? 'succeeded' : payment.status,
      amount: payment.amount,
      currency: payment.currency,
    };
  } catch (error) {
    console.error('Paystack get payment status error:', error);
    throw new Error('Failed to retrieve payment status');
  }
}

// Detect if customer is from Ghana based on phone number
export function isGhanaianCustomer(phoneNumber: string): boolean {
  // Remove any non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Ghana country code is +233
  // Check if number starts with 233 or if it's a local Ghana number (starts with 0)
  return cleanNumber.startsWith('233') ||
         (cleanNumber.startsWith('0') && cleanNumber.length === 10);
}

// Get supported currencies for Paystack
export function getSupportedCurrencies(): string[] {
  return ['GHS', 'NGN', 'USD', 'ZAR', 'KES'];
}

// Convert currency if needed
export function normalizeCurrency(currency: string): string {
  const currencyUpper = currency.toUpperCase();
  const supported = getSupportedCurrencies();

  if (supported.includes(currencyUpper)) {
    return currencyUpper;
  }

  // Default to GHS for Ghanaian customers
  return 'GHS';
}
