
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE: Delete a board owned by the logged-in user
export const DELETE = async (_request,context) => {
  try {
    // 1. Verify the logged-in user
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Find the user in the database
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // 3. Read the board ID from the URL
    const { id } = await context.params;

    if (!id || !id.trim()) {
      return NextResponse.json(
        { error: "Invalid board ID." },
        { status: 400 }
      );
    }

    // 4. Delete only if this user owns the board
    const result = await prisma.whiteboard.deleteMany({
      where: {
        id,
        ownerId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          error:
            "Board not found or you do not have permission to delete it.",
        },
        { status: 404 }
      );
    }

    // 5. Confirm successful deletion
    return NextResponse.json({
      success: true,
      message: "Whiteboard deleted successfully.",
    });
  } catch (error) {
    console.error("Delete board error:", error);

    return NextResponse.json(
      { error: "Failed to delete board. Please try again." },
      { status: 500 }
    );
  }
};
