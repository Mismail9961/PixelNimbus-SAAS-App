import { NextRequest,NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  try {
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid video ID" },
        { status: 400 }
      );
    }

    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as { code?: string; message?: string };

    console.error("Delete failed:", err.message || err);

    if (err.code === "P2025") {
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
