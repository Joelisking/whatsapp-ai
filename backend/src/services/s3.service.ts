import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import crypto from 'crypto';

// Initialize S3 Client
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export interface PresignedUrlParams {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

/**
 * Generate a presigned URL for uploading a product image
 */
export async function generateProductImageUploadUrl(
  params: PresignedUrlParams
): Promise<UploadUrlResponse> {
  try {
    // Validate file type (only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(params.fileType)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (params.fileSize > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    // Generate unique file key
    const fileExtension = params.fileName.split('.').pop();
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const fileKey = `${config.aws.s3.productImagePrefix}${timestamp}-${uniqueId}.${fileExtension}`;

    // Create presigned URL for upload (valid for 5 minutes)
    const command = new PutObjectCommand({
      Bucket: config.aws.s3.bucket,
      Key: fileKey,
      ContentType: params.fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    // Generate public URL
    const publicUrl = `https://${config.aws.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${fileKey}`;

    return {
      uploadUrl,
      fileKey,
      publicUrl,
    };
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    throw new Error(`Failed to generate upload URL: ${error.message}`);
  }
}

/**
 * Delete a product image from S3
 */
export async function deleteProductImage(fileKey: string): Promise<void> {
  try {
    if (!fileKey) {
      return;
    }

    // Extract key from full URL if provided
    let key = fileKey;
    if (fileKey.startsWith('http')) {
      const url = new URL(fileKey);
      key = url.pathname.substring(1); // Remove leading slash
    }

    const command = new DeleteObjectCommand({
      Bucket: config.aws.s3.bucket,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`Deleted image: ${key}`);
  } catch (error: any) {
    console.error('Error deleting image from S3:', error);
    // Don't throw error - log it but continue
    // This prevents product deletion from failing if image is already gone
  }
}

/**
 * Check if an image exists in S3
 */
export async function imageExists(fileKey: string): Promise<boolean> {
  try {
    if (!fileKey) {
      return false;
    }

    // Extract key from full URL if provided
    let key = fileKey;
    if (fileKey.startsWith('http')) {
      const url = new URL(fileKey);
      key = url.pathname.substring(1);
    }

    const command = new HeadObjectCommand({
      Bucket: config.aws.s3.bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    console.error('Error checking image existence:', error);
    return false;
  }
}

/**
 * Extract file key from S3 URL
 */
export function extractFileKeyFromUrl(url: string): string | null {
  try {
    if (!url || !url.startsWith('http')) {
      return url; // Already a key
    }

    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch (error) {
    console.error('Error extracting file key from URL:', error);
    return null;
  }
}

/**
 * Validate if URL is from our S3 bucket
 */
export function isValidS3Url(url: string): boolean {
  if (!url || !url.startsWith('http')) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    const bucketHost = `${config.aws.s3.bucket}.s3.${config.aws.region}.amazonaws.com`;
    const altBucketHost = `${config.aws.s3.bucket}.s3.amazonaws.com`;

    return urlObj.hostname === bucketHost || urlObj.hostname === altBucketHost;
  } catch (error) {
    return false;
  }
}
