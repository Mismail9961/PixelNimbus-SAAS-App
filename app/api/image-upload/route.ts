import { NextResponse, NextRequest } from "next/server";
import ImageKit from "imagekit";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import sharp, { Metadata } from "sharp";
import crypto from "crypto";

interface ImageKitUploadResult {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  fileType: string;
  size: number;
  width?: number;
  height?: number;
  filePath: string;
  tags?: string[];
  customMetadata?: Record<string, any>;
  isPrivateFile?: boolean;
  versionInfo?: {
    id: string;
    name: string;
  };
  [key: string]: unknown;
}

interface ImageProcessingOptions {
  quality?: number;
  format?: "auto" | "webp" | "jpg" | "png";
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

const requiredEnvVars = [
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT",
] as const;

const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing ImageKit environment variables: ${missingEnvVars.join(", ")}`
  );
}

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

const UPLOAD_CONSTRAINTS = {
  maxFileSize: 50 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/tiff",
  ],
  maxDimensions: {
    width: 8000,
    height: 8000,
  },
} as const;

function generateUniqueFilename(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString("hex");
  const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
  return `${userId}_${timestamp}_${randomHash}.${extension}`;
}

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/tiff",
] as const;

function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (file.size > UPLOAD_CONSTRAINTS.maxFileSize) {
    return {
      isValid: false,
      error: `File size exceeds ${
        UPLOAD_CONSTRAINTS.maxFileSize / (1024 * 1024)
      }MB limit`,
    };
  }

  if (
    !allowedMimeTypes.includes(file.type as (typeof allowedMimeTypes)[number])
  ) {
    return {
      isValid: false,
      error: `Unsupported file type: ${file.type}`,
    };
  }

  return { isValid: true };
}

async function preprocessImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<{ processedBuffer: Buffer; metadata: Metadata }> {
  const {
    quality = 85,
    maxWidth = 2048,
    maxHeight = 2048,
    enableOptimization = true,
  } = options;

  let sharpInstance = sharp(buffer);
  const metadata = await sharpInstance.metadata(); // ✅ used below in return

  if (!enableOptimization) {
    return { processedBuffer: buffer, metadata };
  }

  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
  }

  sharpInstance = sharpInstance.rotate();

  const processedBuffer = await sharpInstance
    .jpeg({ quality, progressive: true, mozjpeg: true })
    .toBuffer();

  console.log("Image metadata:", metadata); // Optional: useful during dev

  return { processedBuffer, metadata };
}

async function uploadToImageKit(
  buffer: Buffer,
  options: {
    folder: string;
    fileName: string;
    userId: string;
    originalName: string;
  }
): Promise<ImageKitUploadResult> {
  const uploadOptions = {
    file: buffer,
    fileName: options.fileName,
    folder: options.folder,
    tags: [
      `userId_${options.userId}`, 
      `original_${options.originalName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      `uploaded_${new Date().toISOString().split('T')[0]}`
    ],
    useUniqueFileName: true,
  };

  const result = await imagekit.upload(uploadOptions);
  return result as unknown as ImageKitUploadResult;
}

function generateImageUrls(url: string, fileId: string): {
  original: string;
  optimized: string;
  thumbnail: string;
  responsive: string[];
} {
  // Remove the filename from the URL to get the base path
  const baseUrl = url.substring(0, url.lastIndexOf('/'));
  const fileName = url.substring(url.lastIndexOf('/') + 1);

  return {
    original: url,
    optimized: `${baseUrl}/tr:q-auto,f-auto,pr-true/${fileName}`,
    thumbnail: `${baseUrl}/tr:w-300,h-300,c-maintain_ratio,q-auto,f-auto/${fileName}`,
    responsive: [
      `${baseUrl}/tr:w-400,q-auto,f-auto/${fileName}`,
      `${baseUrl}/tr:w-800,q-auto,f-auto/${fileName}`,
      `${baseUrl}/tr:w-1200,q-auto,f-auto/${fileName}`,
      `${baseUrl}/tr:w-1920,q-auto,f-auto/${fileName}`,
    ],
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { userId: clerkId } = await auth();
    if (!clerkId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    if (!clerkUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    await getOrCreateUser(
      clerkId,
      clerkUser.emailAddresses[0]?.emailAddress ?? "unknown@example.com",
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        "Anonymous"
    );

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const processingOptions = JSON.parse(
      (formData.get("options") as string) || "{}"
    ) as ImageProcessingOptions;

    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const validation = validateImageFile(file);
    if (!validation.isValid)
      return NextResponse.json({ error: validation.error }, { status: 400 });

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const { processedBuffer } = await preprocessImage(
      originalBuffer,
      processingOptions
    );

    const uniqueFilename = generateUniqueFilename(file.name, clerkId);

    const uploadResult = await uploadToImageKit(processedBuffer, {
      folder: "/professional-uploads/users",
      fileName: uniqueFilename,
      userId: clerkId,
      originalName: file.name,
    });

    const imageUrls = generateImageUrls(uploadResult.url, uploadResult.fileId);

    const response: UploadResponse = {
      publicId: uploadResult.fileId,
      secureUrl: uploadResult.url,
      optimizedUrl: imageUrls.optimized,
      thumbnailUrl: imageUrls.thumbnail,
      metadata: {
        width: uploadResult.width || 0,
        height: uploadResult.height || 0,
        format: uploadResult.fileType,
        size: uploadResult.size,
        processedSize: processedBuffer.length,
      },
      transformations: [
        "Auto-quality optimization",
        "Progressive loading",
        "Format auto-detection",
        "Responsive sizing",
        ...(processingOptions.enableOptimization
          ? ["Smart compression", "EXIF rotation"]
          : []),
      ],
    };

    console.log(`Image processed in ${Date.now() - startTime}ms`);
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Upload failed:", error.message);
    } else {
      console.error("Upload failed:", error);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("publicId"); // Keep the same parameter name for compatibility

  if (!fileId)
    return NextResponse.json({ error: "File ID required" }, { status: 400 });

  try {
    const result = await imagekit.getFileDetails(fileId);

    const imageUrls = generateImageUrls(result.url, result.fileId);

    return NextResponse.json({
      publicId: result.fileId,
      metadata: {
        width: result.width || 0,
        height: result.height || 0,
        format: result.fileType,
        size: result.size,
        uploadedAt: result.createdAt,
      },
      urls: imageUrls,
      context: {
        tags: result.tags,
        userId: result.tags?.find(tag => tag.startsWith('userId_'))?.replace('userId_', ''),
        originalName: result.tags?.find(tag => tag.startsWith('original_'))?.replace('original_', '').replace(/_/g, '.'),
        uploadDate: result.tags?.find(tag => tag.startsWith('uploaded_'))?.replace('uploaded_', ''),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Metadata fetch failed:", error.message);
    } else {
      console.error("Metadata fetch failed:", error);
    }
    return NextResponse.json(
      { error: "Failed to fetch image metadata" },
      { status: 404 }
    );
  }
}