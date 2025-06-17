import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Optional: validate UUID format (if your id is UUID)
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid video ID" },
        { status: 400 }
      );
    }

    // Delete the video from the database
    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete failed:", error);

    if (error.code === "P2025") {
      // Prisma error when record doesn't exist
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}

