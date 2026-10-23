import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = {
    params: Promise<{ id: string }>;
};

const shareSchema = z.object({
    email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
    role: z.enum(["EDITOR", "VIEWER"]),
});

async function getAuthenticatedUser() {
    const session = await auth();

    if (!session?.user?.email) {
        return {
            user: null,
            response: NextResponse.json(
                { error: "Please log in first." },
                { status: 401 }
            ),
        };
    }

    const user = await prisma.user.findUnique({
        where: {
            email: session.user.email.toLowerCase(),
        },
        select: {
            id: true,
            email: true,
        },
    });

    if (!user) {
        return {
            user: null,
            response: NextResponse.json(
                {
                    error:
                        "Your account could not be found. Please log in again.",
                },
                { status: 404 }
            ),
        };
    }

    return { user, response: null };
}

export async function POST(
    request: Request,
    context: RouteContext
) {
    try {
        const { user, response } = await getAuthenticatedUser();

        if (!user) {
            return (
                response ??
                NextResponse.json(
                    { error: "Unauthorized." },
                    { status: 401 }
                )
            );
        }

        const { id } = await context.params;

        if (!id?.trim()) {
            return NextResponse.json(
                { error: "A valid whiteboard ID is required." },
                { status: 400 }
            );
        }

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                {
                    error: "Invalid request body. Please send valid JSON.",
                },
                { status: 400 }
            );
        }

        const parsed = shareSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error:
                        "Enter a valid email address and select EDITOR or VIEWER.",
                },
                { status: 400 }
            );
        }

        const board = await prisma.whiteboard.findUnique({
            where: { id },
            select: { ownerId: true },
        });

        if (!board) {
            return NextResponse.json(
                { error: "Whiteboard not found." },
                { status: 404 }
            );
        }

        if (board.ownerId !== user.id) {
            return NextResponse.json(
                {
                    error:
                        "Only the whiteboard owner can share this board.",
                },
                { status: 403 }
            );
        }

        const invitedUser = await prisma.user.findUnique({
            where: { email: parsed.data.email },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        if (!invitedUser) {
            return NextResponse.json(
                {
                    error:
                        "No account exists for this email. Ask the person to register first.",
                },
                { status: 404 }
            );
        }

        if (invitedUser.id === user.id) {
            return NextResponse.json(
                {
                    error: "You are already the owner of this whiteboard.",
                },
                { status: 400 }
            );
        }

        const member = await prisma.boardMember.upsert({
            where: {
                boardId_userId: {
                    boardId: id,
                    userId: invitedUser.id,
                },
            },
            update: {
                role: parsed.data.role,
            },
            create: {
                boardId: id,
                userId: invitedUser.id,
                role: parsed.data.role,
            },
        });

        return NextResponse.json({
            success: true,
            member: {
                email: invitedUser.email,
                name: invitedUser.name,
                role: member.role,
            },
        });
    } catch (error: unknown) {
        console.error("Share whiteboard error:", error);

        return NextResponse.json(
            {
                error:
                    "Unable to share this whiteboard right now. Please try again.",
            },
            { status: 500 }
        );
    }
}

export async function GET(
    _request: Request,
    context: RouteContext
) {
    try {
        const { user, response } = await getAuthenticatedUser();

        if (!user) {
            return (
                response ??
                NextResponse.json(
                    { error: "Unauthorized." },
                    { status: 401 }
                )
            );
        }

        const { id } = await context.params;

        if (!id?.trim()) {
            return NextResponse.json(
                { error: "A valid whiteboard ID is required." },
                { status: 400 }
            );
        }

        const board = await prisma.whiteboard.findUnique({
            where: { id },
            select: {
                ownerId: true,
                members: {
                    select: {
                        id: true,
                        role: true,
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!board) {
            return NextResponse.json(
                { error: "Whiteboard not found." },
                { status: 404 }
            );
        }

        const isMember = board.members.some(
            (member: { user: { email: string } }) =>
                member.user.email.toLowerCase() ===
                user.email.toLowerCase()
        );

        if (board.ownerId !== user.id && !isMember) {
            return NextResponse.json(
                {
                    error:
                        "You do not have permission to view this board's members.",
                },
                { status: 403 }
            );
        }

        return NextResponse.json({
            members: board.members,
        });
    } catch (error: unknown) {
        console.error("Load board members error:", error);

        return NextResponse.json(
            {
                error:
                    "Unable to load board members right now. Please try again.",
            },
            { status: 500 }
        );
    }
}