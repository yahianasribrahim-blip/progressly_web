"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, MessageCircle, TrendingUp, Folder, BarChart3, DollarSign, Activity } from "lucide-react";

interface AdminStats {
    totalUsers: number;
    usersThisMonth: number;
    activeSubscriptions: number;
    activeUsersToday: number;
    monthlyRevenue: number;
    openTickets: number;
    totalSavedIdeas: number;
    totalSavedTrends: number;
    totalTickets: number;
    subscriptionBreakdown: { stripePriceId: string | null; _count: number }[];
    toolUsage: {
        videoBreakdowns: number;
        trendingFormats: number;
        optimizations: number;
    };
}

interface AdminDashboardProps {
    stats: AdminStats;
}

// Price ID to plan name mapping
const PRICE_NAMES: Record<string, string> = {
    "price_1Sb7hNLQIkjmWYDF0oowtF8F": "Creator Monthly",
    "price_1Sem3GLQIkjmWYDF1rRKulee": "Creator Yearly",
    "price_1Sb7i1LQIkjmWYDF8jTGCDkI": "Pro Monthly",
    "price_1Sem3yLQIkjmWYDFLFTG5qNL": "Pro Yearly",
};

export function AdminDashboard({ stats }: AdminDashboardProps) {
    // Build tools usage from real stats
    const TOOLS_USAGE = [
        { name: "Video Breakdown", count: stats.toolUsage.videoBreakdowns, color: "bg-blue-500" },
        { name: "Trending Formats", count: stats.toolUsage.trendingFormats, color: "bg-purple-500" },
        { name: "Optimizations (Script/Caption/Cover)", count: stats.toolUsage.optimizations, color: "bg-green-500" },
    ];

    // Calculate max usage for chart scaling
    const maxUsage = Math.max(...TOOLS_USAGE.map(t => t.count), 1);


    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground text-lg">Progressly Analytics & Overview</p>
            </div>

            {/* Top Stats Row */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Monthly Revenue */}
                <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">${stats.monthlyRevenue.toFixed(2)}</div>
                        <p className="text-sm text-muted-foreground">
                            From {stats.activeSubscriptions} active subscriptions
                        </p>
                    </CardContent>
                </Card>

                {/* Total Users */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalUsers}</div>
                        <p className="text-sm text-muted-foreground">
                            +{stats.usersThisMonth} this month
                        </p>
                    </CardContent>
                </Card>

                {/* Active Users Today */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                        <Activity className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.activeUsersToday}</div>
                        <p className="text-sm text-muted-foreground">
                            Users online today
                        </p>
                    </CardContent>
                </Card>

                {/* Open Tickets */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                        <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.openTickets}</div>
                        <p className="text-sm text-muted-foreground">
                            {stats.totalTickets} total tickets
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Tools Usage Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Most Used Tools
                        </CardTitle>
                        <CardDescription>Aggregate tool usage this month</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {TOOLS_USAGE.map((tool, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{tool.name}</span>
                                    <span className="text-muted-foreground">{tool.count} uses</span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${tool.color} rounded-full transition-all`}
                                        style={{ width: `${Math.max((tool.count / maxUsage) * 100, 5)}%` }}
                                    />
                                </div>
                            </div>
                        ))}

                    </CardContent>
                </Card>

                {/* Subscription Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Subscription Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.subscriptionBreakdown.length === 0 ? (
                            <div className="text-center py-8">
                                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground">No active subscriptions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {stats.subscriptionBreakdown.map((sub, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <span className="text-sm font-medium">
                                            {sub.stripePriceId ? PRICE_NAMES[sub.stripePriceId] || sub.stripePriceId : "Free"}
                                        </span>
                                        <Badge variant="secondary" className="text-base px-3">{sub._count} users</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Content Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Folder className="h-5 w-5" />
                        Platform Content
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-3xl font-bold">{stats.totalSavedIdeas}</p>
                            <p className="text-sm text-muted-foreground">Saved Ideas (Content Bank)</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-3xl font-bold">{stats.totalSavedTrends}</p>
                            <p className="text-sm text-muted-foreground">Saved Trends (Trend Bank)</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-3xl font-bold">{stats.totalSavedIdeas + stats.totalSavedTrends}</p>
                            <p className="text-sm text-muted-foreground">Total Saved Content</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
