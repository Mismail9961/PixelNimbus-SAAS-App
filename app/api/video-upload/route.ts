import { NextResponse, NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  [key: string]: unknown;   // ✅ no-explicit-any fixed
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const description = (formData.get("description") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 400 });
    }

    /* ---------- Upload to Cloudinary ---------- */
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalSize = buffer.length; // bytes before upload

    const uploadResult = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "next-cloudinary-uploads", resource_type: "video" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result as CloudinaryUploadResult);
            }
          )
          .end(buffer);
      }
    );

    /* ---------- Write to Prisma ---------- */
    const video = await prisma.video.create({
      data: {
        title,
        description,
        publicId: uploadResult.public_id,
        orignalSize: String(originalSize),
        compressedSize: String(uploadResult.bytes),
        duration: uploadResult.duration ?? 0,
      },
    });

    return NextResponse.json(video, { status: 200 });
  } catch (error) {
    console.error("Upload Video Failed:", error);
    return NextResponse.json({ error: "Upload Video Failed" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
