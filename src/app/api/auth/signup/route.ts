
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";

const signupSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
    try {
        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid request body. Please send valid JSON." },
                { status: 400 }
            );
        }

        const parsed = signupSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error:
                        "Enter a valid name, email, and password (8–72 characters).",
                },
                { status: 400 }
            );
        }

        const { name, email, password } = parsed.data;

        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email is already registered." },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error: unknown) {
        console.error("Signup failed:", error);

        // Handle a duplicate email created by a concurrent request.
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Email is already registered." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Unable to create account. Please try again later." },
            { status: 500 }
        );
    }
}
