import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, DollarSign, MousePointerClick, Check } from "lucide-react";

export const metadata = {
    title: "Affiliate Dashboard – Progressly",
    description: "Track your affiliate referrals and earnings",
};

async function getAffiliateData(userId: string) {
    const affiliate = await prisma.affiliate.findUnique({
        where: { userId },
        include: {
            referrals: {
                select: { id: true, status: true },
            },
            commissions: {
                select: { id: true, amount: true, status: true },
                orderBy: { createdAt: "desc" },
                take: 10,
            },
            payouts: {
                select: { id: true, amount: true, status: true, requestedAt: true },
                orderBy: { requestedAt: "desc" },
            },
        },
    });

    if (!affiliate) return null;

    const clicks = affiliate.referrals.length;
    const signups = affiliate.referrals.filter(r => r.status === "signed_up" || r.status === "converted").length;
    const conversions = affiliate.referrals.filter(r => r.status === "converted").length;

    return {
        affiliate,
        stats: {
            clicks,
            signups,
            conversions,
            conversionRate: clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : "0",
            totalEarnings: affiliate.totalEarnings,
            pendingEarnings: affiliate.pendingEarnings,
            paidEarnings: affiliate.paidEarnings,
        },
        referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/?ref=${affiliate.affiliateCode}`,
    };
}

export default async function AffiliateDashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/affiliate/login");
    }

    const data = await getAffiliateData(session.user.id);

    if (!data) {
        redirect("/affiliate/register");
    }

    const { affiliate, stats, referralLink } = data;

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, {affiliate.firstName || "Affiliate"}!
                    </p>
                </div>
                <Badge className="bg-green-600 text-white">
                    <Check className="h-3 w-3 mr-1" />
                    Approved
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <MousePointerClick className="h-8 w-8 text-violet-600 mb-2" />
                        <p className="text-3xl font-bold">{stats.clicks}</p>
                        <p className="text-sm text-muted-foreground">Clicks</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <Users className="h-8 w-8 text-violet-600 mb-2" />
                        <p className="text-3xl font-bold">{stats.signups}</p>
                        <p className="text-sm text-muted-foreground">Signups</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <BarChart3 className="h-8 w-8 text-violet-600 mb-2" />
                        <p className="text-3xl font-bold">{stats.conversions}</p>
                        <p className="text-sm text-muted-foreground">Conversions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                        <p className="text-3xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Total Earned</p>
                    </CardContent>
                </Card>
            </div>

            {/* Referral Link */}
            <Card className="border-violet-500/50 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                <CardHeader>
                    <CardTitle className="text-lg">Your Referral Link</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 items-center">
                        <code className="flex-1 p-3 bg-white dark:bg-gray-900 rounded-lg text-sm border truncate">
                            {referralLink}
                        </code>
                        <p className="text-sm text-muted-foreground">
                            Share this link to earn 25% commission on every referral!
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Earnings */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Earnings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between p-3 bg-muted rounded-lg">
                            <span className="text-muted-foreground">Pending</span>
                            <span className="font-semibold">${stats.pendingEarnings.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <span className="text-muted-foreground">Paid Out</span>
                            <span className="font-semibold text-green-600">${stats.paidEarnings.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Commission Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4">
                            <p className="text-5xl font-bold text-violet-600">25%</p>
                            <p className="text-muted-foreground mt-2">Recurring on all payments</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
