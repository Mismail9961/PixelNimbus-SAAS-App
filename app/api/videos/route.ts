import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

// Singleton PrismaClient for serverless
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch videos for the authenticated user
    const videos = await prisma.video.findMany({
      where: { user: { clerkId } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(videos, { status: 200 });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json({ error: "Error fetching videos" }, { status: 500 });
  }
}
