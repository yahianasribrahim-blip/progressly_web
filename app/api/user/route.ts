import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Soft delete - mark account as deactivated instead of permanent delete
        // Account will be permanently deleted after 7 days by admin or scheduled job
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                isDeactivated: true,
                deactivatedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Account scheduled for deletion. You have 7 days to reactivate.",
        });
    } catch (error) {
        console.error("Error deactivating account:", error);
        return NextResponse.json(
            { error: "Failed to deactivate account" },
            { status: 500 }
        );
    }
}
