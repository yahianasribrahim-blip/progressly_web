import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAffiliateByUserId, requestPayout, MINIMUM_PAYOUT } from "@/lib/affiliate";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const affiliate = await getAffiliateByUserId(session.user.id);

        if (!affiliate) {
            return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
        }

        const payouts = await prisma.payout.findMany({
            where: { affiliateId: affiliate.id },
            orderBy: { requestedAt: "desc" },
        });

        return NextResponse.json({
            success: true,
            payouts,
            pendingEarnings: affiliate.pendingEarnings,
            minimumPayout: MINIMUM_PAYOUT,
            canRequestPayout: affiliate.pendingEarnings >= MINIMUM_PAYOUT,
        });
    } catch (error) {
        console.error("Error fetching payouts:", error);
        return NextResponse.json(
            { error: "Failed to fetch payouts" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const affiliate = await getAffiliateByUserId(session.user.id);

        if (!affiliate) {
            return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
        }

        if (affiliate.status !== "approved") {
            return NextResponse.json({ error: "Affiliate account not approved" }, { status: 403 });
        }

        const body = await request.json();
        const { amount, paypalEmail } = body;

        if (!paypalEmail) {
            return NextResponse.json({ error: "PayPal email required" }, { status: 400 });
        }

        const payoutAmount = amount || affiliate.pendingEarnings;

        const result = await requestPayout(affiliate.id, payoutAmount, paypalEmail);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Update the affiliate's PayPal email if different
        if (paypalEmail !== affiliate.paypalEmail) {
            await prisma.affiliate.update({
                where: { id: affiliate.id },
                data: { paypalEmail },
            });
        }

        return NextResponse.json({
            success: true,
            payout: result.payout,
            message: "Payout requested! We'll process it within 5-7 business days.",
        });
    } catch (error) {
        console.error("Error requesting payout:", error);
        return NextResponse.json(
            { error: "Failed to request payout" },
            { status: 500 }
        );
    }
}
