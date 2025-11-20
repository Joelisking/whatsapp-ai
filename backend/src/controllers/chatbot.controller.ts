import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { generateAIResponse, detectIntent, extractProductsFromMessage, detectAIConfusion, analyzeConversationForHelp } from '../services/ai.service';
import { sendWhatsAppMessage, sendPaymentLink, parseWebhookMessage, verifyWebhook, sendTypingIndicator } from '../services/whatsapp.service';
import { initializePayment, normalizeCurrency } from '../services/paystack.service';
import { saveConversationContext, getConversationContext } from '../services/redis.service';
import { ownerNotificationService } from '../services/ownerNotification.service';

export async function handleIncomingMessage(req: Request, res: Response) {
  try {
    console.log('=== Incoming WhatsApp Webhook ===');
    console.log('Method:', req.method);
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Handle WhatsApp webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      const verifiedChallenge = verifyWebhook(mode as string, token as string, challenge as string);
      if (verifiedChallenge) {
        return res.status(200).send(verifiedChallenge);
      }
      return res.status(403).send('Forbidden');
    }

    // Parse incoming message
    const messageData = parseWebhookMessage(req.body);

    if (!messageData) {
      return res.status(200).send('OK');
    }

    const { from, messageId, body, name } = messageData;

    // Format phone number with + prefix
    const phoneNumber = from.startsWith('+') ? from : `+${from}`;

    // Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { phoneNumber },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phoneNumber,
          name: name || undefined,
        },
      });
    }

    // Find or create active conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        customerId: customer.id,
        status: { in: ['ACTIVE', 'WAITING_FOR_AGENT'] },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          status: 'ACTIVE',
        },
        include: {
          messages: true,
        },
      });
    }

    // Save incoming message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'CUSTOMER',
        content: body,
        metadata: { whatsappMessageId: messageId },
      },
    });

    // Check if conversation is with agent
    if (conversation.status === 'WITH_AGENT') {
      // Don't auto-respond, agent will handle
      return res.status(200).send('OK');
    }

    // Detect intent
    const intent = await detectIntent(body);

    // Get conversation context from Redis
    let context = await getConversationContext(conversation.id);
    if (!context) {
      context = {
        conversationId: conversation.id,
        customerName: customer.name,
        previousMessages: [],
        cartItems: [],
      };
    }

    // Build message history
    const previousMessages = conversation.messages
      .reverse()
      .map(msg => ({
        role: msg.sender === 'CUSTOMER' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

    context.previousMessages = previousMessages;
    context.currentIntent = intent;

    // Handle special intents
    if (intent === 'HELP' && body.toLowerCase().includes('agent')) {
      await handleAgentHandoff(conversation.id, phoneNumber);
      return res.status(200).send('OK');
    }

    // Check if message mentions products
    const mentionedProducts = await extractProductsFromMessage(body);

    // Handle purchase intent
    if (intent === 'PURCHASE' && mentionedProducts.length > 0) {
      await handlePurchaseIntent(conversation.id, phoneNumber, mentionedProducts, body, context);
      return res.status(200).send('OK');
    }

    // Check if conversation shows signs customer needs help
    const conversationAnalysis = analyzeConversationForHelp(previousMessages);
    if (conversationAnalysis.needsHelp) {
      console.log('🚨 Conversation analysis indicates customer needs help:', conversationAnalysis.reason);
      await handleAIConfusionHandoff(conversation.id, phoneNumber, customer.name || 'Customer', body, conversationAnalysis.reason);
      return res.status(200).send('OK');
    }

    // Show typing indicator while AI is thinking
    await sendTypingIndicator(phoneNumber, 'typing');

    // Generate AI response
    const aiResponse = await generateAIResponse(body, context);

    // Check if AI response indicates it needs help
    const aiConfusion = detectAIConfusion(aiResponse);
    if (aiConfusion.needsHelp) {
      console.log('🤔 AI indicated it needs human help:', aiConfusion.reason);
      await handleAIConfusionHandoff(conversation.id, phoneNumber, customer.name || 'Customer', body, aiConfusion.reason);
      return res.status(200).send('OK');
    }

    // Save AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'AI',
        content: aiResponse,
      },
    });

    // Send WhatsApp response
    await sendWhatsAppMessage({
      to: phoneNumber,
      body: aiResponse,
    });

    // Update context in Redis
    await saveConversationContext(conversation.id, {
      ...context,
      previousMessages: [
        ...previousMessages,
        { role: 'user', content: body },
        { role: 'assistant', content: aiResponse },
      ].slice(-10), // Keep last 10 messages
    });

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('=== Error handling incoming message ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    return res.status(500).json({
      error: 'Error processing message',
      message: error.message
    });
  }
}

async function handleAgentHandoff(conversationId: string, phoneNumber: string) {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'WAITING_FOR_AGENT' },
  });

  await sendWhatsAppMessage({
    to: phoneNumber,
    body: '👋 Eeii, let me connect you with my manager oo. They go help you better than me. Just hold on small! 🙏🏾',
  });

  // Save system message
  await prisma.message.create({
    data: {
      conversationId,
      sender: 'SYSTEM',
      content: 'Customer requested agent assistance',
    },
  });
}

async function handleAIConfusionHandoff(
  conversationId: string,
  phoneNumber: string,
  customerName: string,
  lastMessage: string,
  reason: string
) {
  // Update conversation status
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'WAITING_FOR_AGENT' },
  });

  // Send friendly message to customer
  await sendWhatsAppMessage({
    to: phoneNumber,
    body: '😊 Chale, let me connect you with someone who can help you better oo. They go reach you soon. No wahala! 🙏🏾',
  });

  // Save system message
  await prisma.message.create({
    data: {
      conversationId,
      sender: 'SYSTEM',
      content: `AI handoff triggered: ${reason}`,
    },
  });

  // Notify owner(s) on WhatsApp
  await ownerNotificationService.notifyAINeedsHelp({
    customerName,
    customerPhone: phoneNumber,
    conversationId,
    lastMessage,
    reason,
  });

  console.log(`✅ Owner notified about AI handoff for conversation ${conversationId}`);
}

async function handlePurchaseIntent(
  conversationId: string,
  phoneNumber: string,
  products: any[],
  userMessage: string,
  context: any
) {
  try {
    // Extract quantity from message (default to 1)
    const quantityMatch = userMessage.match(/(\d+)/);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

    const product = products[0]; // Take first mentioned product

    // Check stock
    if (product.stock < quantity) {
      await sendWhatsAppMessage({
        to: phoneNumber,
        body: `Sorry, we only have ${product.stock} units of ${product.name} in stock. Would you like to order ${product.stock} instead?`,
      });
      return;
    }

    // Create order
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const totalAmount = product.price * quantity;

    const customer = await prisma.customer.findUnique({
      where: { phoneNumber },
    });

    const order = await prisma.order.create({
      data: {
        customerId: customer!.id,
        orderNumber,
        status: 'PENDING',
        totalAmount,
        currency: product.currency,
        items: {
          create: [
            {
              productId: product.id,
              quantity,
              price: product.price,
            },
          ],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Use Paystack for payment processing
    const currency = normalizeCurrency(product.currency);
    const payment = await initializePayment({
      amount: totalAmount,
      currency,
      customerEmail: customer!.email || `customer-${customer!.id}@placeholder.com`,
      customerPhone: phoneNumber,
      orderId: order.id,
      metadata: {
        orderNumber,
        paymentProvider: 'paystack',
      },
    });

    // Update order with payment reference
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentIntentId: payment.reference,
        metadata: {
          paymentProvider: 'paystack',
        },
      },
    });

    // Send payment link via WhatsApp
    await sendPaymentLink(phoneNumber, payment.authorizationUrl, totalAmount, currency, 'paystack');

    // Save AI message
    await prisma.message.create({
      data: {
        conversationId,
        sender: 'AI',
        content: `Payment link sent for ${quantity}x ${product.name}`,
      },
    });

    // Notify owner(s) about new order
    await ownerNotificationService.notifyNewOrder({
      orderNumber,
      customerName: customer!.name || 'Customer',
      customerPhone: phoneNumber,
      items: [
        {
          productName: product.name,
          quantity,
          price: product.price,
        },
      ],
      totalAmount,
      currency,
    });

    console.log(`✅ Owner notified about new order ${orderNumber}`);

    // Update context
    context.cartItems = [
      {
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
      },
    ];
    await saveConversationContext(conversationId, context);
  } catch (error) {
    console.error('Purchase intent error:', error);
    await sendWhatsAppMessage({
      to: phoneNumber,
      body: 'Sorry, there was an error processing your order. Please try again or contact our support team.',
    });
  }
}

export async function handleWebhookStatus(req: Request, res: Response) {
  try {
    // Handle WhatsApp message status updates
    const statusData = req.body;
    console.log('WhatsApp status update:', JSON.stringify(statusData, null, 2));

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling webhook status:', error);
    res.status(500).send('Error');
  }
}
