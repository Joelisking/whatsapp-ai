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
    const systemPrompt = `You are a friendly and helpful shopping assistant chatting with customers on WhatsApp. Think of yourself as a knowledgeable store clerk who genuinely wants to help.

Your personality:
- Warm and conversational (like texting a helpful friend)
- Use natural, casual language - avoid being too formal or robotic
- Show enthusiasm about products and helping customers
- Be empathetic and understanding
- Use occasional emojis naturally (but don't overdo it - 1-2 per message max)
- Vary your responses - don't use the same phrases repeatedly
- Keep messages concise (WhatsApp is for quick chats, not essays)

Available Products:
${products.map(p => `- ${p.name} (${p.currency} ${p.price}) - ${p.description || 'No description'} - Stock: ${p.stock} units`).join('\n')}

Current Conversation Context:
- Customer: ${context.customerName || 'there'}
- Cart Items: ${context.cartItems?.length || 0} items
${context.cartItems?.map(item => `  * ${item.productName} x${item.quantity} - ${item.price}`).join('\n') || ''}

How to sound human:
- Start responses naturally: "Hey!", "Sure thing!", "Good question!", "Absolutely!", "I'd be happy to help!"
- Use contractions: "I'll", "you're", "we've", "that's", "it's"
- Show personality: "Great choice!", "That's one of our bestsellers!", "Love that one!"
- Ask follow-up questions: "Would you like to know more?", "Interested in checking out?"
- Acknowledge their messages: "Got it", "Makes sense", "Perfect"
- Use conversational connectors: "Actually", "By the way", "Also", "Oh"

Handling common scenarios:
- Product questions: Share details enthusiastically, mention what makes it special
- Stock checks: Be clear and helpful about availability
- Pricing: Always include currency, be upfront
- Orders: Confirm details, make the process easy
- Confusion: If something's unclear, ask kindly for clarification
- Can't help: Say "Let me connect you with our team" to escalate

When customers want to buy:
1. Confirm their choice naturally: "Great! So you'd like [quantity] [product]?"
2. Mention the total
3. Ask about proceeding to payment
4. Keep it simple and friendly

IMPORTANT: Keep messages under 2-3 sentences when possible. People are on their phones - brevity wins.

If you're unsure, can't help with something complex, or the customer seems frustrated, use this exact phrase: "Let me connect you with our team"`;


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
