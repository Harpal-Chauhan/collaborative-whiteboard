import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createBoardSchema = z.object({
    title: z.string().trim().min(1).max(100).optional()
})

// GET: Fetch boards belonging to the logged-in user
export const GET = async () => {
    try {
        const session = await auth()
        const email = session?.user?.email

        if(!email) {
            return NextResponse.json(
                { error: "Unauthorized. Please log in." },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if(!user) {
            return NextResponse.json(
                { error: "User not found." },
                { status: 404 }
            )
        }

        const boards = await prisma.whiteboard.findMany({
            where: {
                OR: [
                    { ownerId: user.id },
                    { members: { some: { userId: user.id } } }
                ]
            },
            select: {
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true,
                ownerId: true
            },
            orderBy: { updatedAt: "desc" }
        })

        return NextResponse.json({ boards })
    } catch (error) {
        console.error("Fetch boards error:", error);

        return NextResponse.json(
            { error: "Failed to fetch boards." },
            { status: 500 }
        )
    }
}

// POST: Create a new board
export const POST = async (request: Request) => {
    try {
        const session = await auth()
        const email = session?.user?.email

        if(!email) {
            return NextResponse.json(
                { error: "Unauthorized. Please log in." },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if(!user) {
            return NextResponse.json(
                { error: "User not found." },
                { status: 404 }
            )
        }

        const body: unknown = await request.json()
        const parsed = createBoardSchema.safeParse(body)

        if(!parsed.success) {
            return NextResponse.json(
                { error: "Invalid board title." },
                { status: 400 }
            )
        }

        const board = await prisma.whiteboard.create({
            data: {
                title: parsed.data.title || "Untitled Whiteboard",
                ownerId: user.id
            }
        })

        return NextResponse.json({ board }, { status: 201 })
    } catch (error) {
        console.error("Create board error:", error);
        
        return NextResponse.json(
            { error: "Failed to create board." },
            { status: 500 }
        )
    }
}