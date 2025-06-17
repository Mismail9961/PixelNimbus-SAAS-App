import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import sharp from "sharp";
import crypto from "crypto";

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
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing Cloudinary environment variables: ${missingEnvVars.join(", ")}`
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
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
): Promise<{ processedBuffer: Buffer; metadata: any }> {
  const {
    quality = 85,
    maxWidth = 2048,
    maxHeight = 2048,
    enableOptimization = true,
  } = options;

  let sharpInstance = sharp(buffer);
  const metadata = await sharpInstance.metadata();

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
    resource_type: "image" as const,
    transformation: [
      {
        quality: "auto:good",
        fetch_format: "auto",
        flags: "progressive",
      },
    ],
    context: {
      userId: options.userId,
      originalName: options.originalName,
      uploadDate: new Date().toISOString(),
    },
    overwrite: false,
    unique_filename: true,
    use_filename: false,
  };

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error || !result) {
          reject(new Error(error?.message || "Upload failed"));
        } else {
          resolve(result as CloudinaryUploadResult);
        }
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
      `${baseUrl}/w_400,q_auto,f_auto/${publicId}`,
      `${baseUrl}/w_800,q_auto,f_auto/${publicId}`,
      `${baseUrl}/w_1200,q_auto,f_auto/${publicId}`,
      `${baseUrl}/w_1920,q_auto,f_auto/${publicId}`,
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
    const { processedBuffer, metadata } = await preprocessImage(
      originalBuffer,
      processingOptions
    );

    const uniqueFilename = generateUniqueFilename(file.name, clerkId);
    const publicId = `users/${clerkId}/${uniqueFilename.split(".")[0]}`;

    const uploadResult = await uploadToCloudinary(processedBuffer, {
      folder: "professional-uploads",
      publicId,
      userId: clerkId,
      originalName: file.name,
    });

    const imageUrls = generateImageUrls(uploadResult.public_id);

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

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("Upload failed:", error);
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
  const publicId = searchParams.get("publicId");

  if (!publicId)
    return NextResponse.json({ error: "Public ID required" }, { status: 400 });

  try {
    const result = await cloudinary.api.resource(publicId, {
      context: true,
      image_metadata: true,
      colors: true,
      derived: true,
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
        uploadedAt: result.created_at,
      },
      urls: imageUrls,
      context: result.context,
    });
  } catch (error) {
    console.error("Metadata fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch image metadata" },
      { status: 404 }
    );
  }
}
