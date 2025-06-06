import { NextRequest,NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient()

export async function GET(req:NextRequest){
    try {
        const vedios = await prisma.video.findMany({
            orderBy:{createdAt:"desc"}
        })
        return NextResponse.json(vedios)
    } catch (error) {
        return NextResponse.json({error:"Error fetching videos"})
    } finally {
        await prisma.$disconnect()
    }
}