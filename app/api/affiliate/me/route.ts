import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const affiliate = await prisma.affiliate.findUnique({
            where: { userId: session.user.id },
            select: {
                id: true,
                affiliateCode: true,
                status: true,
                firstName: true,
                lastName: true,
                email: true,
                totalEarnings: true,
                pendingEarnings: true,
                paidEarnings: true,
            },
        });

        if (!affiliate) {
            return NextResponse.json({ affiliate: null });
        }

        return NextResponse.json({ affiliate });
    } catch (error) {
        console.error("Error fetching affiliate:", error);
        return NextResponse.json(
            { error: "Failed to fetch affiliate data" },
            { status: 500 }
        );
    }
}
