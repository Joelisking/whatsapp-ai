import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { prisma } from '../config/database';

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

export interface ConversationContext {
  conversationId: string;
  customerName?: string;
  previousMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  currentIntent?: string;
  cartItems?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export async function generateAIResponse(
  userMessage: string,
  context: ConversationContext
): Promise<string> {
  try {
    // Get available products for context
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        stock: true,
        category: true,
      },
    });

    // Build system prompt with business context
    const systemPrompt = `You are a helpful WhatsApp AI assistant for an e-commerce business. Your role is to:
1. Help customers discover and learn about products
2. Answer questions about inventory, pricing, and product details
3. Guide customers through the purchase process
4. Provide excellent customer service

Available Products:
${products.map(p => `- ${p.name} (${p.currency} ${p.price}) - ${p.description || 'No description'} - Stock: ${p.stock} units`).join('\n')}

Current Conversation Context:
- Customer: ${context.customerName || 'Unknown'}
- Cart Items: ${context.cartItems?.length || 0} items
${context.cartItems?.map(item => `  * ${item.productName} x${item.quantity} - ${item.price}`).join('\n') || ''}

Guidelines:
- Be friendly, professional, and concise
- Always check product availability before recommending
- If asked about a product not in the list, politely explain it's not available
- Help guide customers to complete their purchase
- If you need to escalate to a human agent, say "Let me connect you with our team"
- Use emojis sparingly and appropriately

When a customer wants to buy something:
1. Confirm the product and quantity
2. Add to cart (mention: "I'll add this to your cart")
3. Ask if they want to continue shopping or proceed to checkout
4. For checkout, collect shipping details if needed
5. Generate a payment link

Remember: Keep responses short for WhatsApp (2-3 sentences max when possible).`;

    // Build message history
    const messages: Anthropic.MessageParam[] = [
      ...context.previousMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const aiResponse = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, I encountered an error. Please try again.';

    return aiResponse;
  } catch (error) {
    console.error('AI service error:', error);
    throw new Error('Failed to generate AI response');
  }
}

// Intent detection helper
export async function detectIntent(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('order')) {
    return 'PURCHASE';
  }
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
    return 'INQUIRY_PRICE';
  }
  if (lowerMessage.includes('available') || lowerMessage.includes('stock') || lowerMessage.includes('in stock')) {
    return 'INQUIRY_AVAILABILITY';
  }
  if (lowerMessage.includes('track') || lowerMessage.includes('order status') || lowerMessage.includes('delivery')) {
    return 'ORDER_TRACKING';
  }
  if (lowerMessage.includes('cancel') || lowerMessage.includes('return') || lowerMessage.includes('refund')) {
    return 'ORDER_MODIFICATION';
  }
  if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('agent')) {
    return 'HELP';
  }

  return 'GENERAL';
}

// Extract product names from message
export async function extractProductsFromMessage(message: string): Promise<any[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  const mentionedProducts = products.filter(product =>
    message.toLowerCase().includes(product.name.toLowerCase())
  );

  return mentionedProducts;
}
