import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// DELETE - Admin delete a user
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        if (currentUser?.role !== "ADMIN") {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        // Don't allow deleting yourself
        if (params.id === session.user.id) {
            return NextResponse.json({ success: false, error: "Cannot delete yourself" }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ success: false, error: "Failed to delete user" }, { status: 500 });
    }
}

// PATCH - Admin update a user (role, etc)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        if (currentUser?.role !== "ADMIN") {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { role } = body;

        const user = await prisma.user.update({
            where: { id: params.id },
            data: { role },
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
    }
}
