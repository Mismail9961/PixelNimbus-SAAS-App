import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server"; // ✅ CORRECT

const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth(); // ✅ no req here

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videos = await prisma.video.findMany({
      where: {
        userId, // Make sure your schema matches
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(videos, { status: 200 });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Error fetching videos" },
      { status: 500 }
    );
  }
}
