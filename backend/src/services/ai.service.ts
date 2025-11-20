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
    const systemPrompt = `You are a warm and friendly Ghanaian shop assistant helping customers on WhatsApp. Chat naturally like you're talking to someone face-to-face in Accra or Kumasi.

Your personality:
- Speak like a Ghanaian - use expressions like "Chale", "Ei!", "Abi?", "Small small", "No wahala", etc. naturally in conversation
- Be warm, friendly, and relatable - like talking to a friend or neighbor
- Keep it casual but respectful - like how Ghanaians naturally chat
- Use conversational language, not corporate speak
- It's okay to use Pidgin English or local expressions when it feels natural
- Be helpful and patient, like a good shopkeeper

Available Products:
${products.map(p => `- ${p.name} (${p.currency} ${p.price}) - ${p.description || 'No description'} - Stock: ${p.stock} units`).join('\n')}

Current Conversation:
- Customer: ${context.customerName || 'Our customer'}
- Cart: ${context.cartItems?.length || 0} items
${context.cartItems?.map(item => `  * ${item.productName} x${item.quantity}`).join('\n') || ''}

How to chat:
- Be natural and conversational, like you're chatting on WhatsApp
- Keep responses short (2-3 sentences) - people don't read long messages on WhatsApp
- Use emojis naturally (😊, 👍🏾, 🙏🏾, 💯, etc.)
- If you don't understand something or can't help properly, be honest and say you'll get someone to help
- When you're not sure or the customer seems confused/frustrated, say something like "Chale, let me connect you with my boss/manager to help you properly" or "Ei, this one I need to get my manager to help you oo"

When someone wants to buy:
1. Confirm what they want naturally (like "Okay, so you want [product] abi?")
2. Check stock and tell them straight
3. Help them complete the order step by step
4. Be encouraging and friendly throughout

IMPORTANT: If you're confused about what the customer wants, or they're asking complex questions you can't answer well, or they seem frustrated - be honest and offer to connect them with a human. Say something like:
- "Chale, this one pass me small oo. Let me call my manager to help you properly"
- "Ei, I think I need to get someone who can explain this better for you. Give me a moment"
- "You know what, let me connect you with my boss. They can help you better than me"

Remember: You're chatting on WhatsApp with Ghanaians. Keep it real, friendly, and natural!`;


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

// Detect if AI response indicates confusion or need for human help
export function detectAIConfusion(aiResponse: string): { needsHelp: boolean; reason: string } {
  const lowerResponse = aiResponse.toLowerCase();

  // Check for phrases indicating AI wants to escalate
  const escalationPhrases = [
    'connect you with',
    'let me call my manager',
    'let me get someone',
    'my boss',
    'my manager',
    'this one pass me',
    'i need to get someone',
    'help you better than me',
    'connect you with our team',
    'speak to someone',
    'human agent',
    'customer service',
    'i\'m not sure',
    'i don\'t understand',
    'i can\'t help',
    'beyond my knowledge'
  ];

  for (const phrase of escalationPhrases) {
    if (lowerResponse.includes(phrase)) {
      return {
        needsHelp: true,
        reason: 'AI indicated it needs human assistance'
      };
    }
  }

  return { needsHelp: false, reason: '' };
}

// Analyze conversation for signs customer needs human help
export function analyzeConversationForHelp(messages: Array<{ role: string; content: string }>): {
  needsHelp: boolean;
  reason: string;
} {
  if (messages.length < 2) {
    return { needsHelp: false, reason: '' };
  }

  const recentMessages = messages.slice(-5); // Check last 5 messages

  // Check for repetitive questions (customer asking same thing multiple times)
  const userMessages = recentMessages.filter(m => m.role === 'user');
  if (userMessages.length >= 3) {
    const uniqueMessages = new Set(userMessages.map(m => m.content.toLowerCase().trim()));
    if (uniqueMessages.size <= 1) {
      return {
        needsHelp: true,
        reason: 'Customer repeating the same question - may be frustrated'
      };
    }
  }

  // Check for frustration indicators
  const lastUserMessages = userMessages.slice(-2).map(m => m.content.toLowerCase());
  const frustrationWords = [
    'frustrated', 'angry', 'useless', 'waste', 'stupid', 'talk to human',
    'speak to person', 'real person', 'manager', 'supervisor', 'complaint',
    'not helping', 'don\'t understand', 'can\'t help', 'ridiculous'
  ];

  for (const msg of lastUserMessages) {
    for (const word of frustrationWords) {
      if (msg.includes(word)) {
        return {
          needsHelp: true,
          reason: 'Customer showing signs of frustration or requesting human'
        };
      }
    }
  }

  // Check for complex queries that might need human expertise
  const complexIndicators = [
    'custom', 'special request', 'exception', 'urgent', 'emergency',
    'complaint', 'issue with', 'problem with', 'not working', 'broken',
    'refund', 'return', 'exchange', 'cancel order'
  ];

  const lastMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';
  for (const indicator of complexIndicators) {
    if (lastMessage.includes(indicator)) {
      return {
        needsHelp: true,
        reason: 'Customer query may require human expertise'
      };
    }
  }

  return { needsHelp: false, reason: '' };
}
