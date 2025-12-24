import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAffiliateByUserId, getAffiliateStats, COMMISSION_RATE, MINIMUM_PAYOUT } from "@/lib/affiliate";

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

        if (affiliate.status !== "approved") {
            return NextResponse.json({
                success: true,
                status: affiliate.status,
                message: affiliate.status === "pending"
                    ? "Your application is pending review"
                    : "Your affiliate account is suspended",
            });
        }

        const stats = await getAffiliateStats(affiliate.id);

        return NextResponse.json({
            success: true,
            status: affiliate.status,
            affiliateCode: affiliate.affiliateCode,
            referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/?ref=${affiliate.affiliateCode}`,
            commissionRate: COMMISSION_RATE * 100,
            minimumPayout: MINIMUM_PAYOUT,
            paypalEmail: affiliate.paypalEmail,
            stats,
            recentReferrals: affiliate.referrals.slice(0, 10).map(r => ({
                id: r.id,
                status: r.status,
                signedUpAt: r.signedUpAt,
                convertedAt: r.convertedAt,
                userName: r.referredUser?.name || "Anonymous",
            })),
            recentCommissions: affiliate.commissions.slice(0, 10).map(c => ({
                id: c.id,
                amount: c.amount,
                status: c.status,
                createdAt: c.createdAt,
            })),
            payouts: affiliate.payouts.map(p => ({
                id: p.id,
                amount: p.amount,
                status: p.status,
                requestedAt: p.requestedAt,
                processedAt: p.processedAt,
            })),
        });
    } catch (error) {
        console.error("Error fetching affiliate stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
