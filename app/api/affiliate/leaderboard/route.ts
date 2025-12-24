import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        // Get top affiliates with their referral counts
        const affiliates = await prisma.affiliate.findMany({
            where: {
                status: "approved",
            },
            select: {
                id: true,
                affiliateCode: true,
                firstName: true,
                socialHandle: true,
                totalEarnings: true,
                _count: {
                    select: {
                        referrals: {
                            where: {
                                status: { in: ["signed_up", "converted"] }
                            }
                        }
                    }
                },
                user: {
                    select: {
                        name: true,
                        image: true,
                    }
                }
            },
            orderBy: {
                totalEarnings: "desc",
            },
            take: 20,
        });

        // Transform data for leaderboard
        const leaderboard = affiliates.map((affiliate, index) => ({
            rank: index + 1,
            name: affiliate.firstName || affiliate.user.name || "Anonymous",
            socialHandle: affiliate.socialHandle,
            avatar: affiliate.user.image,
            signups: affiliate._count.referrals,
            earningsLevel: getEarningsLevel(affiliate.totalEarnings),
        }));

        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json(
            { error: "Failed to fetch leaderboard" },
            { status: 500 }
        );
    }
}

// Convert actual earnings to levels (badges) for privacy
function getEarningsLevel(earnings: number): string {
    if (earnings >= 1000) return "diamond";
    if (earnings >= 500) return "gold";
    if (earnings >= 100) return "silver";
    if (earnings >= 25) return "bronze";
    return "starter";
}
