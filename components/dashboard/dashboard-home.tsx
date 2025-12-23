"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Video,
    FileText,
    MessageSquare,
    Image,
    CheckSquare,
    ArrowRight,
    Sparkles,
    TrendingUp,
    Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UsageData {
    formatSearches: { used: number; limit: number; unlimited: boolean };
    optimizations: { used: number; limit: number; unlimited: boolean };
    analyses: { used: number; limit: number; unlimited: boolean };
}


interface DashboardHomeProps {
    userId: string;
    userName: string;
    plan: string;
    canAnalyze: boolean;
    remaining: number;
    limitMessage?: string;
}

const OPTIMIZER_TOOLS = [
    {
        title: "Video Breakdown",
        description: "Paste any TikTok/Reel URL to learn what makes it work",
        icon: Video,
        href: "/dashboard/analyze-video",
        color: "from-violet-500 to-purple-500",
        bgColor: "bg-violet-50 dark:bg-violet-950/30",
        iconColor: "text-violet-600",
        featured: true,
    },
    {
        title: "Script Optimizer",
        description: "Write scripts that hook viewers and keep them watching",
        icon: FileText,
        href: "/dashboard/script-optimizer",
        color: "from-blue-500 to-cyan-500",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        iconColor: "text-blue-600",
        featured: true,
    },
    {
        title: "Caption Optimizer",
        description: "Craft captions that stop the scroll and drive engagement",
        icon: MessageSquare,
        href: "/dashboard/caption-optimizer",
        color: "from-emerald-500 to-green-500",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        iconColor: "text-emerald-600",
    },
    {
        title: "Cover Grader",
        description: "Get feedback on your thumbnail before posting",
        icon: Image,
        href: "/dashboard/cover-grader",
        color: "from-amber-500 to-orange-500",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        iconColor: "text-amber-600",
    },
    {
        title: "Content Bank",
        description: "Your saved video ideas and plans",
        icon: CheckSquare,
        href: "/dashboard/content-bank",
        color: "from-rose-500 to-pink-500",
        bgColor: "bg-rose-50 dark:bg-rose-950/30",
        iconColor: "text-rose-600",
    },
];

export function DashboardHome({
    userName,
    plan,
    remaining,
    limitMessage,
}: DashboardHomeProps) {
    const greeting = getGreeting();
    const [usageData, setUsageData] = useState<UsageData | null>(null);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const res = await fetch("/api/usage");
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setUsageData(data.usage);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch usage:", error);
            }
        };
        fetchUsage();
    }, []);

    // Calculate remaining values from usage data
    const analysesRemaining = usageData?.analyses.unlimited
        ? -1
        : (usageData?.analyses.limit || 0) - (usageData?.analyses.used || 0);
    const formatSearchesRemaining = usageData?.formatSearches.unlimited
        ? -1
        : (usageData?.formatSearches.limit || 0) - (usageData?.formatSearches.used || 0);
    const optimizationsRemaining = usageData?.optimizations.unlimited
        ? -1
        : (usageData?.optimizations.limit || 0) - (usageData?.optimizations.used || 0);

    return (

        <div className="space-y-8">
            {/* Hero Section */}
            <div className="rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10 border p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">
                            {greeting}, {userName.split(" ")[0]}! ✨
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Ready to create content that converts? Pick a tool below to get started.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-sm py-1 px-3">
                            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                        </Badge>
                        {remaining > 0 && (
                            <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-sm py-1 px-3">
                                {remaining} {remaining === 1 ? "analysis" : "analyses"} left
                            </Badge>
                        )}
                    </div>
                </div>

                {limitMessage && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-800 dark:text-amber-200">{limitMessage}</p>
                    </div>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Video Breakdowns</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analysesRemaining === -1 ? "∞" : usageData ? analysesRemaining : remaining}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {analysesRemaining === -1 ? "unlimited on Pro plan" : `left this week`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Trending Format Searches</CardTitle>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatSearchesRemaining === -1 ? "∞" : usageData ? formatSearchesRemaining : (plan === "starter" ? "10" : "2")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {formatSearchesRemaining === -1 ? "unlimited on Pro plan" : `left this month`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Optimizations</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {optimizationsRemaining === -1 ? "∞" : usageData ? optimizationsRemaining : (plan === "starter" ? "20" : "5")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {optimizationsRemaining === -1 ? "unlimited on Pro plan" : `left this month`}
                        </p>
                    </CardContent>
                </Card>
            </div>


            {/* Optimizer Tools Grid */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Content Optimization Tools</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {OPTIMIZER_TOOLS.map((tool) => (
                        <Link key={tool.href} href={tool.href}>
                            <Card className={cn(
                                "h-full transition-all hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 cursor-pointer group",
                                tool.featured && "ring-2 ring-violet-500/20"
                            )}>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-lg",
                                            tool.bgColor
                                        )}>
                                            <tool.icon className={cn("h-5 w-5", tool.iconColor)} />
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                {tool.title}
                                                {tool.featured && (
                                                    <Badge variant="secondary" className="text-xs">Popular</Badge>
                                                )}
                                            </CardTitle>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>{tool.description}</CardDescription>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}
