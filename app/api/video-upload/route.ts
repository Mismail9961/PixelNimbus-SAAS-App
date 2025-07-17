import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import ImageKit from "imagekit";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

const prisma = new PrismaClient();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

interface VideoProcessingOptions {
  enableEnhancement?: boolean;
  quality?: "auto" | "high" | "medium" | "low";
  generateThumbnail?: boolean;
  analyzeContent?: boolean;
}

const UPLOAD_CONSTRAINTS = {
  maxFileSize: 500 * 1024 * 1024, // 500MB
  allowedMimeTypes: [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
  ],
};

// Extract video duration using fluent-ffmpeg
function extractVideoDuration(buffer: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer);
    ffmpeg(stream).ffprobe((err: unknown, data: any) => {
      if (err) return reject(err);
      resolve(data?.format?.duration || 0);
    });
  });
}

// Mock enhancement pipeline (can be replaced with AI processing)
async function processVideoWithAI(
  buffer: Buffer,
  options: VideoProcessingOptions = {}
): Promise<{ processedBuffer: Buffer; metadata: Record<string, any> }> {
  return {
    processedBuffer: buffer,
    metadata: {
      quality: options.quality ?? "auto",
      hasEnhancement: options.enableEnhancement ?? true,
      hasThumbnail: options.generateThumbnail ?? true,
      hasContentAnalysis: options.analyzeContent ?? true,
      tags: [],
    },
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress ?? "unknown@example.com";
    const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Anonymous";
    const appUser = await getOrCreateUser(clerkId, email, name);
    if (!appUser) return NextResponse.json({ error: "User creation failed" }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const originalSize = formData.get("originalSize") as string | null;

    const options: VideoProcessingOptions = {
      enableEnhancement: formData.get("enableEnhancement") === "true",
      quality: (formData.get("quality") as VideoProcessingOptions["quality"]) ?? "auto",
      generateThumbnail: formData.get("generateThumbnail") === "true",
      analyzeContent: formData.get("analyzeContent") === "true",
    };

    if (!file || !file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Valid video file required" }, { status: 400 });
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (file.size > UPLOAD_CONSTRAINTS.maxFileSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { processedBuffer, metadata } = await processVideoWithAI(buffer, options);

    // Upload to ImageKit
    const uploadResult = await imagekit.upload({
      file: processedBuffer,
      fileName: `${title.trim().replace(/\s+/g, "_")}.mp4`,
      folder: "/next-video-uploads/",
      useUniqueFileName: true,
      tags: ["video", appUser.id],
    });

    const originalSizeNum = parseInt(originalSize || file.size.toString());
    const compressedSizeNum = processedBuffer.length;
    const compressionRatio = (
      ((originalSizeNum - compressedSizeNum) / originalSizeNum) * 100
    ).toFixed(1);

    const duration = await extractVideoDuration(buffer);

    const enhancedURL = imagekit.url({
      path: uploadResult.filePath,
      transformation: options.enableEnhancement
        ? [{ quality: options.quality ?? "auto" }, { effect: "sharpen" }]
        : [],
    });

    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "",
        publicId: uploadResult.filePath,
        thumbnailPublicId: "", // Add real thumbnail ID if you generate one
        originalSize: originalSizeNum.toString(),
        compressedSize: compressedSizeNum.toString(),
        duration,
        userId: appUser.id,
        metadata: {
          processingOptions: options,
          aiMetadata: metadata,
          transformations: options.enableEnhancement ? ["quality", "sharpen"] : [],
          enhancedURL,
          compressionApplied: file.size >= 2 * 1024 * 1024,
        } as unknown as Prisma.JsonObject,
      },
    });

    return NextResponse.json(
      {
        data: video,
        processing: {
          aiEnhanced: options.enableEnhancement,
          quality: options.quality,
          thumbnailGenerated: options.generateThumbnail,
          contentAnalyzed: options.analyzeContent,
          compressionApplied: file.size >= 2 * 1024 * 1024,
          sizeReduction: compressionRatio,
          enhancedURL,
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
