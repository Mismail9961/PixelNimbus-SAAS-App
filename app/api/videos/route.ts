import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function GET(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth();
    console.log("Fetched Clerk ID:", clerkId);

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔍 Find internal app user by Clerk ID
    const appUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Resolved internal user ID:", appUser.id);

    // ✅ Now use appUser.id to fetch videos
    const videos = await prisma.video.findMany({
      where: { userId: appUser.id },
      orderBy: { createdAt: "desc" },
    });

    console.log("Fetched videos from DB:", videos);

    return NextResponse.json(videos, { status: 200 });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Error fetching videos" },
      { status: 500 }
    );
  }
}
