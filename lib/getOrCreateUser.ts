import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getOrCreateUser(clerkId: string, email?: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  if (!email || !name) {
    throw new Error("Both email and name are required to create a user.");
  }

  return prisma.user.create({
    data: {
      clerkId,
      email,
      name
    }
  });
}
