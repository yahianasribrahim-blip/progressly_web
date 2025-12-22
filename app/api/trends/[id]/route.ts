import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// DELETE - Remove a saved trend
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Verify ownership before deleting
        const trend = await prisma.savedTrend.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!trend) {
            return NextResponse.json({ error: "Trend not found" }, { status: 404 });
        }

        await prisma.savedTrend.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting trend:", error);
        return NextResponse.json({ error: "Failed to delete trend" }, { status: 500 });
    }
}
