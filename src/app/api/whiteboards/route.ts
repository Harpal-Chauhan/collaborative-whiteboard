import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const getCurrentUser = async () => {
    const session = await auth()

    if (!session?.user?.email) return null

    return prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true }
    })
}

// GET: current user's whiteboards
export const GET = async () => {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { error: "Please log in first" },
                { status: 401 }
            )
        }

        const whiteboards = await prisma.whiteboard.findMany({
            where: {
                OR: [
                    { ownerId: user.id },
                    {
                        members: {
                            some: { userId: user.id }
                        }
                    }
                ]
            },
            orderBy: { updatedAt: "desc" },
            include: {
                owner: {
                    select: { id: true, name: true, email: true }
                },
                members: {
                    where: { userId: user.id },
                    select: { role: true }
                }
            }
        })

        return NextResponse.json(whiteboards)
    } catch (error) {
        console.error("Load whiteboards error:", error);

        return NextResponse.json(
            { error: "Failed to load whiteboards" },
            { status: 500 }
        )
    }
}

// POST: create a whiteboard 
export const POST = async (request: Request) => {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { error: "Please log in first" },
                { status: 401 }
            )
        }

        const parsed = z.object({
            title: z.string().trim().min(1).max(100).optional()
        }).safeParse(await request.json())

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid whiteboard title" },
                { status: 400 }
            )
        }

        const whiteboard = await prisma.whiteboard.create({
            data: {
                title: parsed.data.title || "My Whiteboard",
                ownerId: user.id,
                content: "[]"
            }
        })

        return NextResponse.json(whiteboard, { status: 201 })
    } catch {
        return NextResponse.json(
            { error: "Failed to create whiteboard" },
            { status: 500 }
        )
    }
}

// PATCH: save a whiteboard's content
// export const PATCH = async (request: Request) => {
//     try {
//         const user = await getCurrentUser()

//         if(!user) {
//             return NextResponse.json(
//                 { error: "Please log in first" },
//                 { status: 401 }
//             )
//         }

//         const parsed = z.object({
//             id: z.string().min(1),
//             content: z.string().max(1_000_000),
//         }).safeParse(await request.json())

//         if(!parsed.success) {
//             return NextResponse.json(
//                 { error: "Invalid whiteboard data" },
//                 { status: 400 }
//             )
//         }

//         const board = await prisma.whiteboard.findUnique({
//             where: { id: parsed.data.id },
//             select: {
//                 ownerId: true,
//                 members: {
//                     where: { userId: user.id },
//                     select: { role: true }
//                 }
//             }
//         })

//         if(!board) {
//             return NextResponse.json(
//                 { error: "Whiteboard not found" },
//                 { status: 404 }
//             )
//         }

//         const isOwner = board.ownerId === user.id
//         const isEditor = board.members.some(
//             (member) => member.role === "EDITOR"
//         )

//         if(!isOwner && !isEditor) {
//             return NextResponse.json(
//                 { error: "You do not have permission to edit this whiteboard" },
//                 { status: 403 }
//             )
//         }   

//         await prisma.whiteboard.update({
//             where: { id: parsed.data.id },
//             data: { content: parsed.data.content}
//         })

//         return NextResponse.json({ success: true })

//     } catch (error) {
//         console.error("Save whiteboard error:", error);

//         return NextResponse.json(
//             { error: "Failed to save whiteboard" },
//             { status: 500 }
//         )
//     }
// }

export const PATCH = async (request: Request) => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: "Please log in first" },
                { status: 401 }
            );
        }

        const parsed = z.object({
            id: z.string().min(1),
            content: z.string().max(1_000_000),
        }).safeParse(await request.json());

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid whiteboard data" },
                { status: 400 }
            );
        }

        const board = await prisma.whiteboard.findUnique({
            where: { id: parsed.data.id },
            select: {
                ownerId: true,
                members: {
                    where: { userId: user.id },
                    select: { role: true },
                },
            },
        });

        if (!board) {
            return NextResponse.json(
                { error: "Whiteboard not found" },
                { status: 404 }
            );
        }

        const isOwner = board.ownerId === user.id;

        const isEditor = board.members.some(
            (member: { role: string }) => member.role === "EDITOR"
        );

        if (!isOwner && !isEditor) {
            return NextResponse.json(
                { error: "You do not have permission to edit this whiteboard" },
                { status: 403 }
            );
        }

        await prisma.whiteboard.update({
            where: { id: parsed.data.id },
            data: { content: parsed.data.content },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Save whiteboard error:", error);

        return NextResponse.json(
            { error: "Failed to save whiteboard" },
            { status: 500 }
        );
    }
};
