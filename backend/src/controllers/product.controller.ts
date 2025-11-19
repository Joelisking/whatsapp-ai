import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export async function getAllProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, search, isActive } = req.query;

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ products });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, price, currency, stock, category, imageUrl, metadata } = req.body;

    if (!name || price === undefined || stock === undefined) {
      throw new AppError(400, 'Name, price, and stock are required');
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        currency: currency || 'USD',
        stock,
        category,
        imageUrl,
        metadata,
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, price, currency, stock, category, imageUrl, isActive, metadata } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        currency,
        stock,
        category,
        imageUrl,
        isActive,
        metadata,
      },
    });

    res.json({ product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
}
