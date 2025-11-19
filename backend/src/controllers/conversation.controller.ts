import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { sendWhatsAppMessage } from '../services/whatsapp.service';

export async function getAllConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, customerId, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.conversation.count({ where });

    res.json({ conversations, total });
  } catch (error) {
    next(error);
  }
}

export async function getConversationById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new AppError(404, 'Conversation not found');
    }

    res.json({ conversation });
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const authReq = req as any;

    if (!content) {
      throw new AppError(400, 'Message content is required');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!conversation) {
      throw new AppError(404, 'Conversation not found');
    }

    // Update conversation status if it was waiting for agent
    if (conversation.status === 'WAITING_FOR_AGENT') {
      await prisma.conversation.update({
        where: { id },
        data: {
          status: 'WITH_AGENT',
          assignedTo: authReq.user.id,
        },
      });
    }

    // Save message
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        sender: 'AGENT',
        content,
      },
    });

    // Send via WhatsApp
    await sendWhatsAppMessage({
      to: conversation.customer.phoneNumber,
      body: content,
    });

    res.json({ message });
  } catch (error) {
    next(error);
  }
}

export async function updateConversationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError(400, 'Status is required');
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    res.json({ conversation });
  } catch (error) {
    next(error);
  }
}
