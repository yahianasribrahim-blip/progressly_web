import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserUsage, getUserSubscription, PLAN_LIMITS } from "@/lib/user";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const usage = await getUserUsage(session.user.id);
        const subscription = await getUserSubscription(session.user.id);
        const plan = subscription?.plan || "free";

        // Get limits for the user's plan
        const limits = PLAN_LIMITS[plan];

        // Get analysis limit - pro uses analysesPerDay, others use analysesPerWeek
        const analysisLimit = plan === "pro"
            ? (limits as typeof PLAN_LIMITS.pro).analysesPerDay
            : (limits as typeof PLAN_LIMITS.free).analysesPerWeek;

        return NextResponse.json({
            success: true,
            usage: {
                formatSearches: {
                    used: usage.formatSearchesThisMonth,
                    limit: plan === "pro" ? -1 : limits.formatRefreshesPerMonth,
                    unlimited: plan === "pro",
                },
                optimizations: {
                    used: usage.optimizationsThisMonth,
                    limit: plan === "pro" ? -1 : limits.optimizationsPerMonth,
                    unlimited: plan === "pro",
                },
                analyses: {
                    used: usage.analysesThisMonth,
                    limit: plan === "pro" ? -1 : analysisLimit,
                    unlimited: plan === "pro",
                },
            },
            plan,
            currentMonth: usage.currentMonth,
            currentYear: usage.currentYear,
        });
    } catch (error) {
        console.error("Error fetching usage:", error);
        return NextResponse.json(
            { error: "Failed to fetch usage data" },
            { status: 500 }
        );
    }
}
