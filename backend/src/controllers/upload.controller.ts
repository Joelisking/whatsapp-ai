import { Request, Response } from 'express';
import { generateProductImageUploadUrl } from '../services/s3.service';

/**
 * Generate presigned URL for product image upload
 */
export async function getProductImageUploadUrl(req: Request, res: Response) {
  try {
    const { fileName, fileType, fileSize } = req.body;

    // Validate required fields
    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({
        error: 'Missing required fields: fileName, fileType, fileSize',
      });
    }

    // Generate presigned URL
    const uploadData = await generateProductImageUploadUrl({
      fileName,
      fileType,
      fileSize: parseInt(fileSize),
    });

    return res.status(200).json({
      success: true,
      data: uploadData,
    });
  } catch (error: any) {
    console.error('Upload URL generation error:', error);
    return res.status(400).json({
      error: error.message || 'Failed to generate upload URL',
    });
  }
}
