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

// PATCH - Admin update a user (role, plan, etc)
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
        const { role, plan } = body;

        // Build update data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};

        if (role) {
            updateData.role = role;
        }

        if (plan !== undefined) {
            // Plan values: "free", "creator_monthly", "creator_yearly", "pro_monthly", "pro_yearly"
            const planMapping: Record<string, string | null> = {
                "free": null,
                "creator_monthly": "price_1Sb7hNLQIkjmWYDF0oowtF8F",
                "creator_yearly": "price_1Sem3GLQIkjmWYDF1rRKulee",
                "pro_monthly": "price_1Sb7i1LQIkjmWYDF8jTGCDkI",
                "pro_yearly": "price_1Sem3yLQIkjmWYDFLFTG5qNL",
            };

            updateData.stripePriceId = planMapping[plan] || null;

            // If setting to free, clear subscription data
            if (plan === "free") {
                updateData.stripeSubscriptionId = null;
                updateData.stripeCurrentPeriodEnd = null;
            } else {
                // Set a far future end date for manual upgrades (1 year from now)
                updateData.stripeSubscriptionId = "manual_admin_upgrade";
                updateData.stripeCurrentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            }
        }

        const user = await prisma.user.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
    }
}
