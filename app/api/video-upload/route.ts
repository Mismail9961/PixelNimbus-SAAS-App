import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient for serverless
const prisma = new PrismaClient();

// Validate Cloudinary environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error("Cloudinary environment variables are missing");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  bytes: number;
  duration?: number;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    console.log("Starting video upload request");
    const { userId } = await auth();
    if (!userId) {
      console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const originalSize = formData.get("originalSize") as string | null;

    // Validate inputs
    if (!file) {
      console.log("No file provided");
      return NextResponse.json({ error: "File not found" }, { status: 400 });
    }
    if (!file.type.startsWith("video/")) {
      console.log("Invalid file type:", file.type);
      return NextResponse.json({ error: "File must be a video" }, { status: 400 });
    }
    if (!title || title.trim().length === 0) {
      console.log("No title provided");
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Fallback for originalSize
    const effectiveOriginalSize = originalSize && !isNaN(Number(originalSize)) ? originalSize : file.size.toString();
    console.log(`Form data: title=${title}, originalSize=${originalSize}, effectiveOriginalSize=${effectiveOriginalSize}`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`Uploading video: size=${file.size} bytes, userId=${userId}`);

    // Upload to Cloudinary
    const startTime = Date.now();
    const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "next-cloudinary-uploads", resource_type: "video" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary callback error:", {
              message: error.message,
              http_code: error.http_code,
              name: error.name,
            });
            return reject(error);
          }
          if (!result) {
            console.error("Cloudinary upload failed: No result returned");
            return reject(new Error("No result returned"));
          }
          resolve(result as CloudinaryUploadResult);
        }
      );

      // Handle stream errors
      uploadStream.on("error", (streamError) => {
        console.error("Upload stream error:", streamError);
        reject(streamError);
      });

      // Log stream completion
      uploadStream.on("end", () => {
        console.log("Upload stream ended");
      });

      try {
        uploadStream.end(buffer);
      } catch (writeError) {
        console.error("Error writing to upload stream:", writeError);
        reject(writeError);
      }
    });

    console.log(`Cloudinary upload successful: public_id=${uploadResult.public_id}, duration=${Date.now() - startTime}ms`);

    // Write to Prisma
    const video = await prisma.$transaction(async (tx) => {
      return tx.video.create({
        data: {
          title: title.trim(),
          description: description?.trim() || "",
          publicId: uploadResult.public_id,
          originalSize: effectiveOriginalSize,
          compressedSize: uploadResult.bytes.toString(),
          duration: uploadResult.duration ?? 0,
        },
      });
    });

    console.log(`Video saved to database: id=${video.id}`);
    return NextResponse.json({ data: video }, { status: 200 });
  } catch (error: any) {
    console.error("Upload Video Failed:", {
      error: error.message || "Unknown error message",
      stack: error.stack || "No stack trace",
      http_code: error.http_code || "No code",
    });
    return NextResponse.json(
      { error: `Upload failed: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}