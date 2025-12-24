import { prisma } from "@/lib/db";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, TrendingUp, Star, Gem, Medal, Award, Rocket } from "lucide-react";

export const metadata: Metadata = {
    title: "Top Affiliates – Progressly",
    description: "See our top-performing affiliates and join the program to earn commission.",
};

async function getLeaderboard() {
    const affiliates = await prisma.affiliate.findMany({
        where: {
            status: "approved",
        },
        select: {
            id: true,
            firstName: true,
            socialHandle: true,
            totalEarnings: true,
            createdAt: true,
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

    return affiliates.map((affiliate, index) => ({
        rank: index + 1,
        name: affiliate.firstName || affiliate.user.name || "Anonymous",
        socialHandle: affiliate.socialHandle,
        avatar: affiliate.user.image,
        signups: affiliate._count.referrals,
        earningsLevel: getEarningsLevel(affiliate.totalEarnings),
        joinedAt: affiliate.createdAt,
    }));
}

function getEarningsLevel(earnings: number): { level: string; color: string; icon: React.ComponentType<{ className?: string }> } {
    if (earnings >= 1000) return { level: "Diamond", color: "bg-cyan-500", icon: Gem };
    if (earnings >= 500) return { level: "Gold", color: "bg-yellow-500", icon: Trophy };
    if (earnings >= 100) return { level: "Silver", color: "bg-gray-400", icon: Medal };
    if (earnings >= 25) return { level: "Bronze", color: "bg-orange-600", icon: Award };
    return { level: "Rising Star", color: "bg-violet-500", icon: Rocket };
}

export default async function AffiliatesPage() {
    const leaderboard = await getLeaderboard();

    return (
        <div className="container py-12 md:py-20">
            {/* Header */}
            <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4">
                    <Trophy className="h-3 w-3 mr-1" />
                    Affiliate Program
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Top Affiliates
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Join our affiliate program and earn 25% recurring commission for every creator you refer.
                </p>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="text-4xl font-bold text-violet-600 mb-2">{leaderboard.length}+</div>
                        <p className="text-muted-foreground">Active Affiliates</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="text-4xl font-bold text-violet-600 mb-2">25%</div>
                        <p className="text-muted-foreground">Commission Rate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="text-4xl font-bold text-violet-600 mb-2">$50</div>
                        <p className="text-muted-foreground">Min. Payout</p>
                    </CardContent>
                </Card>
            </div>

            {/* Leaderboard */}
            <Card className="mb-12">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-violet-500" />
                        Leaderboard
                    </CardTitle>
                    <CardDescription>
                        Our top-performing affiliates this month
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {leaderboard.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Be the first to join our affiliate program!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {leaderboard.map((affiliate) => {
                                const LevelIcon = affiliate.earningsLevel.icon;
                                return (
                                    <div
                                        key={affiliate.rank}
                                        className={`flex items-center gap-4 p-4 rounded-lg border ${affiliate.rank <= 3 ? "bg-gradient-to-r from-violet-500/5 to-purple-500/5 border-violet-200 dark:border-violet-800" : ""
                                            }`}
                                    >
                                        {/* Rank */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${affiliate.rank === 1 ? "bg-yellow-500 text-white" :
                                                affiliate.rank === 2 ? "bg-gray-400 text-white" :
                                                    affiliate.rank === 3 ? "bg-orange-600 text-white" :
                                                        "bg-muted text-muted-foreground"
                                            }`}>
                                            {affiliate.rank}
                                        </div>

                                        {/* Avatar */}
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium overflow-hidden">
                                            {affiliate.avatar ? (
                                                <img src={affiliate.avatar} alt={affiliate.name} className="w-full h-full object-cover" />
                                            ) : (
                                                affiliate.name.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        {/* Name & Handle */}
                                        <div className="flex-1">
                                            <p className="font-medium">{affiliate.name}</p>
                                            {affiliate.socialHandle && (
                                                <p className="text-sm text-muted-foreground">@{affiliate.socialHandle}</p>
                                            )}
                                        </div>

                                        {/* Signups */}
                                        <div className="text-center hidden sm:block">
                                            <p className="text-lg font-bold">{affiliate.signups}</p>
                                            <p className="text-xs text-muted-foreground">signups</p>
                                        </div>

                                        {/* Level Badge */}
                                        <Badge className={`${affiliate.earningsLevel.color} text-white gap-1`}>
                                            <LevelIcon className="h-3 w-3" />
                                            {affiliate.earningsLevel.level}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-2xl p-8 md:p-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    Ready to Join?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                    Earn 25% recurring commission for every creator you refer. No limit on earnings.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="gap-2">
                        <Link href="/register">
                            <Star className="h-4 w-4" />
                            Sign Up to Apply
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/pricing">
                            Learn More
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
