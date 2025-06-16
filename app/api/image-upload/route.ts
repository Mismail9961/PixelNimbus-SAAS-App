import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import sharp from "sharp";
import crypto from "crypto";

// ─────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────
interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  [key: string]: unknown;
}

interface ImageProcessingOptions {
  quality?: number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  maxWidth?: number;
  maxHeight?: number;
  enableOptimization?: boolean;
  generateThumbnail?: boolean;
}

interface UploadResponse {
  publicId: string;
  secureUrl: string;
  optimizedUrl: string;
  thumbnailUrl?: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    processedSize?: number;
  };
  transformations: string[];
}

// ─────────────────────────────────────────────────────
// Configuration & Validation
// ─────────────────────────────────────────────────────
const requiredEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
] as const;

// Validate environment variables
const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing Cloudinary environment variables: ${missingEnvVars.join(', ')}`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Upload constraints
const UPLOAD_CONSTRAINTS = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/tiff'
  ],
  maxDimensions: {
    width: 8000,
    height: 8000
  }
} as const;

// ─────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────
function generateUniqueFilename(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${userId}_${timestamp}_${randomHash}.${extension}`;
}

function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (file.size > UPLOAD_CONSTRAINTS.maxFileSize) {
    return {
      isValid: false,
      error: `File size exceeds ${UPLOAD_CONSTRAINTS.maxFileSize / (1024 * 1024)}MB limit`
    };
  }

  return { isValid: true };
}

async function preprocessImage(
  buffer: Buffer, 
  options: ImageProcessingOptions = {}
): Promise<{ processedBuffer: Buffer; metadata: any }> {
  const {
    quality = 85,
    maxWidth = 2048,
    maxHeight = 2048,
    enableOptimization = true
  } = options;

  let sharpInstance = sharp(buffer);
  
  // Get original metadata
  const metadata = await sharpInstance.metadata();
  
  if (!enableOptimization) {
    return { processedBuffer: buffer, metadata };
  }

  // Resize if too large
  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
  }

  // Auto-rotate based on EXIF data
  sharpInstance = sharpInstance.rotate();

  // Optimize and convert
  const processedBuffer = await sharpInstance
    .jpeg({ quality, progressive: true, mozjpeg: true })
    .toBuffer();

  return { processedBuffer, metadata };
}

async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    publicId: string;
    userId: string;
    originalName: string;
  }
): Promise<CloudinaryUploadResult> {
  const uploadOptions = {
    folder: options.folder,
    public_id: options.publicId,
    resource_type: 'image' as const,
    
    // Advanced transformations for professional quality
    transformation: [
      {
        quality: 'auto:good',
        fetch_format: 'auto',
        flags: 'progressive',
      }
    ],
    
    // Context and metadata
    context: {
      userId: options.userId,
      originalName: options.originalName,
      uploadDate: new Date().toISOString()
    },
    
    // Basic content analysis (free tier compatible)
    // moderation: 'aws_rek', // Requires paid subscription
    // categorization: 'aws_rek_tagging', // Requires paid subscription
    // auto_tagging: 0.7, // Requires paid subscription
    
    // File handling (free tier compatible)
    overwrite: false,
    unique_filename: true,
    use_filename: false,
  };

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
          return;
        }
        
        if (!result) {
          reject(new Error('No result returned from Cloudinary'));
          return;
        }
        
        resolve(result as CloudinaryUploadResult);
      }
    );
    
    uploadStream.end(buffer);
  });
}

function generateImageUrls(publicId: string): {
  original: string;
  optimized: string;
  thumbnail: string;
  responsive: string[];
} {
  const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  return {
    original: `${baseUrl}/${publicId}`,
    optimized: `${baseUrl}/q_auto,f_auto,fl_progressive/${publicId}`,
    thumbnail: `${baseUrl}/w_300,h_300,c_fill,q_auto,f_auto/${publicId}`,
    responsive: [
      `${baseUrl}/w_400,q_auto,f_auto/${publicId}`,   // Mobile
      `${baseUrl}/w_800,q_auto,f_auto/${publicId}`,   // Tablet
      `${baseUrl}/w_1200,q_auto,f_auto/${publicId}`,  // Desktop
      `${baseUrl}/w_1920,q_auto,f_auto/${publicId}`,  // Large screens
    ]
  };
}

// ─────────────────────────────────────────────────────
// Main API Handler
// ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1️⃣ Authentication & User Management
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" }, 
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" }, 
        { status: 404 }
      );
    }

    // Ensure database user exists
    await getOrCreateUser(
      clerkId,
      clerkUser.emailAddresses[0]?.emailAddress ?? "unknown@example.com",
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "Anonymous"
    );

    // 2️⃣ Parse and Validate Request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const processingOptions = JSON.parse(
      (formData.get("options") as string) || "{}"
    ) as ImageProcessingOptions;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided", code: "FILE_MISSING" }, 
        { status: 400 }
      );
    }

    // 3️⃣ File Validation
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error, code: "INVALID_FILE" }, 
        { status: 400 }
      );
    }

    // 4️⃣ Image Processing
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const { processedBuffer, metadata } = await preprocessImage(
      originalBuffer, 
      processingOptions
    );

    // 5️⃣ Generate unique identifiers
    const uniqueFilename = generateUniqueFilename(file.name, clerkId);
    const publicId = `users/${clerkId}/${uniqueFilename.split('.')[0]}`;

    // 6️⃣ Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(processedBuffer, {
      folder: "professional-uploads",
      publicId,
      userId: clerkId,
      originalName: file.name
    });

    // 7️⃣ Generate optimized URLs
    const imageUrls = generateImageUrls(uploadResult.public_id);

    // 8️⃣ Prepare response
    const response: UploadResponse = {
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      optimizedUrl: imageUrls.optimized,
      thumbnailUrl: imageUrls.thumbnail,
      metadata: {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        size: uploadResult.bytes,
        processedSize: processedBuffer.length
      },
      transformations: [
        'Auto-quality optimization',
        'Progressive loading',
        'Format auto-detection',
        'Responsive sizing',
        ...(processingOptions.enableOptimization ? ['Smart compression', 'EXIF rotation'] : [])
      ]
    };

    // 9️⃣ Performance logging
    const processingTime = Date.now() - startTime;
    console.log(`Image upload completed for user ${clerkId}:`, {
      processingTime: `${processingTime}ms`,
      originalSize: file.size,
      processedSize: processedBuffer.length,
      compressionRatio: `${((1 - processedBuffer.length / file.size) * 100).toFixed(1)}%`,
      publicId: uploadResult.public_id
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error("Advanced image upload failed:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    });

    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Upload failed')) {
        return NextResponse.json(
          { error: "Cloud storage error", code: "UPLOAD_FAILED" },
          { status: 502 }
        );
      }
      
      if (error.message.includes('Image processing')) {
        return NextResponse.json(
          { error: "Image processing failed", code: "PROCESSING_ERROR" },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────
// Optional: GET handler for image metadata
// ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const publicId = searchParams.get('publicId');

  if (!publicId) {
    return NextResponse.json(
      { error: "Public ID required" }, 
      { status: 400 }
    );
  }

  try {
    // Get image details from Cloudinary
    const result = await cloudinary.api.resource(publicId, {
      context: true,
      image_metadata: true,
      colors: true,
      derived: true
    });

    const imageUrls = generateImageUrls(publicId);

    return NextResponse.json({
      publicId: result.public_id,
      metadata: {
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        colors: result.colors,
        uploadedAt: result.created_at
      },
      urls: imageUrls,
      context: result.context
    });

  } catch (error) {
    console.error("Failed to fetch image metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch image data" },
      { status: 404 }
    );
  }
}