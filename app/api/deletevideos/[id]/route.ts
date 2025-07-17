import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await context.params;
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    // Lazy import Prisma to avoid initialization issues
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    try {
      await prisma.video.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error: any) {
    console.error("Delete failed:", error?.message || error);

    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}