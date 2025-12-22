import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, notes } = body;

        // Verify ownership
        const idea = await prisma.savedIdea.findFirst({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!idea) {
            return NextResponse.json({ error: "Idea not found" }, { status: 404 });
        }

        const updatedIdea = await prisma.savedIdea.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
            },
        });

        return NextResponse.json({
            success: true,
            idea: updatedIdea,
        });
    } catch (error) {
        console.error("Error updating idea:", error);
        return NextResponse.json(
            { error: "Failed to update idea" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        const idea = await prisma.savedIdea.findFirst({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!idea) {
            return NextResponse.json({ error: "Idea not found" }, { status: 404 });
        }

        await prisma.savedIdea.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error("Error deleting idea:", error);
        return NextResponse.json(
            { error: "Failed to delete idea" },
            { status: 500 }
        );
    }
}
