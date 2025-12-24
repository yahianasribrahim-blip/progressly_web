import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                isDeactivated: true,
                deactivatedAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "No account found with this email" },
                { status: 404 }
            );
        }

        if (!user.isDeactivated) {
            return NextResponse.json(
                { error: "This account is not deactivated" },
                { status: 400 }
            );
        }

        // Check if within 7-day window
        if (user.deactivatedAt) {
            const daysSinceDeactivation = Math.floor(
                (Date.now() - new Date(user.deactivatedAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceDeactivation >= 7) {
                return NextResponse.json(
                    { error: "The 7-day restoration window has passed. This account cannot be restored." },
                    { status: 400 }
                );
            }
        }

        // Restore the account
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isDeactivated: false,
                deactivatedAt: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Account restored successfully! You can now log in.",
        });
    } catch (error) {
        console.error("Error restoring account:", error);
        return NextResponse.json(
            { error: "Failed to restore account" },
            { status: 500 }
        );
    }
}
