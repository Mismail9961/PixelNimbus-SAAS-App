import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

// ---------------------------
//  Prisma (singleton for Vercel/AWS)
// ---------------------------
const prisma = new PrismaClient();

// ---------------------------
//  Cloudinary config / guard
// ---------------------------
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Cloudinary environment variables are missing");
}

console.log("Cloudinary Config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? "***" : "missing",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "***" : "missing",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------------------
// Types
// ---------------------------
interface VideoProcessingOptions {
  enableEnhancement?: boolean;
  quality?: "auto" | "high" | "medium" | "low";
  generateThumbnail?: boolean;
  analyzeContent?: boolean;
}

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  bytes: number;
  duration?: number;
  transformation?: any[];
  [key: string]: unknown;
}

type VideoMetadata = {
  processingOptions: VideoProcessingOptions;
  aiMetadata: any;
  transformations: any[];
};

// ---------------------------
// Mock AI Processing Function
// ---------------------------
async function processVideoWithAI(
  buffer: Buffer,
  options: VideoProcessingOptions = {}
): Promise<{ processedBuffer: Buffer; metadata: any }> {
  const {
    enableEnhancement = true,
    quality = "auto",
    generateThumbnail = true,
    analyzeContent = true,
  } = options;

  // Placeholder for AI processing service
  return {
    processedBuffer: buffer,
    metadata: {
      quality,
      hasEnhancement: enableEnhancement,
      hasThumbnail: generateThumbnail,
      hasContentAnalysis: analyzeContent,
    },
  };
}

// Add these constants at the top
const UPLOAD_CONSTRAINTS = {
  maxFileSize: 500 * 1024 * 1024, // 500MB
  chunkSize: 6 * 1024 * 1024, // 6MB chunks
  timeout: 300000, // 5 minutes
  allowedMimeTypes: [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
  ],
} as const;

// ---------------------------
// Smart Compression Helper
// ---------------------------
const getCompressionSettings = (originalSizeBytes: number) => {
  const sizeMB = originalSizeBytes / (1024 * 1024);
  
  if (sizeMB < 2) {
    // For very small files (< 2MB), use minimal processing to avoid size increase
    return {
      transformation: [{ fetch_format: "auto" }],
      eager: undefined,
      eager_async: false
    };
  } else if (sizeMB < 10) {
    // For medium files (2-10MB), balanced compression
    return {
      transformation: [
        { quality: "auto:good" },
        { fetch_format: "auto" }
      ],
      eager: [
        { format: "mp4", quality: "auto:good" }
      ],
      eager_async: true
    };
  } else {
    // For large files (>10MB), aggressive compression
    return {
      transformation: [
        { quality: "auto:low" },
        { fetch_format: "auto" }
      ],
      eager: [
        { format: "mp4", quality: "auto:low", bit_rate: "1000k" },
        { format: "webm", quality: "auto:low" }
      ],
      eager_async: true
    };
  }
};

// ---------------------------
// POST /api/videos
// ---------------------------
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate via Clerk
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses[0]?.emailAddress ?? "unknown@example.com";
    const name =
      `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() ||
      "Anonymous";

    // Ensure user exists in DB
    const appUser = await getOrCreateUser(clerkId, email, name);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const originalSize = formData.get("originalSize") as string | null;

    const processingOptions: VideoProcessingOptions = {
      enableEnhancement: formData.get("enableEnhancement") === "true",
      quality:
        (formData.get("quality") as VideoProcessingOptions["quality"]) ||
        "auto",
      generateThumbnail: formData.get("generateThumbnail") === "true",
      analyzeContent: formData.get("analyzeContent") === "true",
    };

    // Validation
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 400 });
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "File must be a video" },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const effectiveOriginalSize =
      originalSize && !isNaN(Number(originalSize))
        ? originalSize
        : file.size.toString();

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process with AI
    const { processedBuffer, metadata } = await processVideoWithAI(
      buffer,
      processingOptions
    );

    // Get smart compression settings based on file size
    const compressionSettings = getCompressionSettings(file.size);

    // Upload to Cloudinary with smart compression
    const startTime = Date.now();
    const uploadOptions = {
      folder: "next-cloudinary-uploads",
      resource_type: "auto" as const,
      timeout: 300000,
      chunk_size: 5000000,
      transformation: compressionSettings.transformation,
      ...(compressionSettings.eager && { eager: compressionSettings.eager }),
      eager_async: compressionSettings.eager_async,
    };

    console.log(`Uploading ${(file.size / (1024 * 1024)).toFixed(2)}MB file with settings:`, {
      hasTransformation: !!compressionSettings.transformation.length,
      hasEager: !!compressionSettings.eager,
      eagerAsync: compressionSettings.eager_async
    });

    const uploadResult = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error("Upload error:", error);
              return reject(error);
            }
            if (!result) {
              return reject(new Error("No result returned from Cloudinary"));
            }
            resolve(result as CloudinaryUploadResult);
          }
        );

        // Handle the buffer in 5MB chunks
        const chunkSize = 5000000; // 5MB chunks
        let offset = 0;

        const writeChunk = () => {
          const chunk = buffer.slice(offset, offset + chunkSize);
          const isLastChunk = offset + chunkSize >= buffer.length;

          uploadStream.write(chunk, (err) => {
            if (err) {
              console.error("Chunk write error:", err);
              return reject(err);
            }

            if (isLastChunk) {
              uploadStream.end();
            } else {
              offset += chunkSize;
              writeChunk();
            }
          });
        };

        writeChunk();
      }
    );

    // Log compression results
    const originalSizeNum = parseInt(effectiveOriginalSize);
    const compressedSizeNum = uploadResult.bytes;
    const compressionRatio = ((originalSizeNum - compressedSizeNum) / originalSizeNum * 100).toFixed(1);
    
    console.log(`Compression results: ${(originalSizeNum / (1024 * 1024)).toFixed(2)}MB -> ${(compressedSizeNum / (1024 * 1024)).toFixed(2)}MB (${compressionRatio}% ${compressionRatio.startsWith('-') ? 'increase' : 'reduction'})`);

    try {
      const video = await prisma.video.create({
        data: {
          title: title.trim(),
          description: description?.trim() || "",
          publicId: uploadResult.public_id,
          originalSize: effectiveOriginalSize,
          compressedSize: uploadResult.bytes.toString(),
          duration: uploadResult.duration ?? 0,
          userId: appUser.id,
          // @ts-ignore
          metadata: {
            processingOptions,
            aiMetadata: metadata,
            transformations: uploadResult.transformation || [],
            compressionApplied: file.size >= 2 * 1024 * 1024, // Track if compression was applied
          },
        },
      });
      
      return NextResponse.json(
        {
          data: video,
          processing: {
            aiEnhanced: processingOptions.enableEnhancement,
            quality: processingOptions.quality,
            thumbnailGenerated: processingOptions.generateThumbnail,
            contentAnalyzed: processingOptions.analyzeContent,
            compressionApplied: file.size >= 2 * 1024 * 1024,
            sizeReduction: compressionRatio
          },
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error("Error saving video metadata:", error);
      return NextResponse.json(
        { error: `Upload failed: ${error.message || "Unknown error"}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Upload Video Failed:", err);
    return NextResponse.json(
      { error: `Upload failed: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}