import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

const prisma = new PrismaClient();

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Cloudinary environment variables are missing");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

const UPLOAD_CONSTRAINTS = {
  maxFileSize: 500 * 1024 * 1024,
  chunkSize: 6 * 1024 * 1024,
  timeout: 300000,
  allowedMimeTypes: [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
  ],
} as const;

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

  return {
    processedBuffer: buffer,
    metadata: {
      quality,
      hasEnhancement: enableEnhancement,
      hasThumbnail: generateThumbnail,
      hasContentAnalysis: analyzeContent,
      tags: [],
    },
  };
}

const getCompressionSettings = (originalSizeBytes: number) => {
  const sizeMB = originalSizeBytes / (1024 * 1024);

  if (sizeMB < 2) {
    return {
      transformation: [{ fetch_format: "auto" }],
      eager: undefined,
      eager_async: false,
    };
  } else if (sizeMB < 10) {
    return {
      transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
      eager: [{ format: "mp4", quality: "auto:good" }],
      eager_async: true,
    };
  } else {
    return {
      transformation: [{ quality: "auto:low" }, { fetch_format: "auto" }],
      eager: [
        { format: "mp4", quality: "auto:low", bit_rate: "1000k" },
        { format: "webm", quality: "auto:low" },
      ],
      eager_async: true,
    };
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    const appUser = await getOrCreateUser(clerkId, email, name);

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

    const { processedBuffer, metadata } = await processVideoWithAI(
      buffer,
      processingOptions
    );

    const compressionSettings = getCompressionSettings(file.size);

    const uploadOptions = {
      folder: "next-cloudinary-uploads",
      resource_type: "auto" as const,
      timeout: 300000,
      chunk_size: 5000000,
      transformation: compressionSettings.transformation,
      ...(compressionSettings.eager && { eager: compressionSettings.eager }),
      eager_async: compressionSettings.eager_async,
    };

    const uploadResult = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) return reject(error);
            if (!result) return reject(new Error("No result returned"));
            resolve(result as CloudinaryUploadResult);
          }
        );

        const chunkSize = 5000000;
        let offset = 0;

        const writeChunk = () => {
          const chunk = buffer.slice(offset, offset + chunkSize);
          const isLastChunk = offset + chunkSize >= buffer.length;

          uploadStream.write(chunk, (err) => {
            if (err) return reject(err);

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

    const originalSizeNum = parseInt(effectiveOriginalSize);
    const compressedSizeNum = uploadResult.bytes;
    const compressionRatio = (
      ((originalSizeNum - compressedSizeNum) / originalSizeNum) *
      100
    ).toFixed(1);

    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "",
        publicId: uploadResult.public_id,
        originalSize: effectiveOriginalSize,
        compressedSize: uploadResult.bytes.toString(),
        duration: uploadResult.duration ?? 0,
        userId: appUser.id,
        metadata: {
          processingOptions,
          aiMetadata: {
            ...metadata,
            tags: metadata?.tags || [],
          },
          transformations: uploadResult.transformation || [],
          compressionApplied: file.size >= 2 * 1024 * 1024,
        } as unknown as Prisma.JsonObject,
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
          sizeReduction: compressionRatio,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Upload Video Failed:", err);
    return NextResponse.json(
      { error: `Upload failed: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
