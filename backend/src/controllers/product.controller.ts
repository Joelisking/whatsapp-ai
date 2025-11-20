import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { deleteProductImage, isValidS3Url } from '../services/s3.service';

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

    // Validate image URL is from our S3 bucket if provided
    if (imageUrl && !isValidS3Url(imageUrl)) {
      throw new AppError(400, 'Invalid image URL. Please upload image through the proper endpoint.');
    }

    let product;
    try {
      product = await prisma.product.create({
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
    } catch (error) {
      // If product creation fails and an image was uploaded, delete it from S3
      if (imageUrl) {
        await deleteProductImage(imageUrl);
        console.log('Deleted orphaned image due to product creation failure');
      }
      throw error;
    }

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, price, currency, stock, category, imageUrl, isActive, metadata } = req.body;

    // Get existing product to check for old image
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new AppError(404, 'Product not found');
    }

    // Validate new image URL if provided
    if (imageUrl && !isValidS3Url(imageUrl)) {
      throw new AppError(400, 'Invalid image URL. Please upload image through the proper endpoint.');
    }

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

    // Delete old image if it was replaced with a new one
    if (existingProduct.imageUrl && imageUrl && existingProduct.imageUrl !== imageUrl) {
      await deleteProductImage(existingProduct.imageUrl);
      console.log('Deleted old product image after update');
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Get product to retrieve image URL before deletion
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    // Delete product from database
    await prisma.product.delete({
      where: { id },
    });

    // Delete associated image from S3 if it exists
    if (product.imageUrl) {
      await deleteProductImage(product.imageUrl);
      console.log('Deleted product image from S3 after product deletion');
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
}
