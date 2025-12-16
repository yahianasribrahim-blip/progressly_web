"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface NicheViewsChartProps {
    niche: string;
}

// Generate data based on niche with more variety
function generateViewsData(niche: string) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Different base views and growth patterns per niche
    const nicheConfig: Record<string, { base: number; growth: number; volatility: number }> = {
        cultural: { base: 85000, growth: 8, volatility: 0.35 },
        deen: { base: 72000, growth: 15, volatility: 0.25 },
        hijab: { base: 95000, growth: 5, volatility: 0.3 },
        food: { base: 120000, growth: 18, volatility: 0.4 },
        gym: { base: 68000, growth: -3, volatility: 0.2 },
        pets: { base: 55000, growth: 22, volatility: 0.35 },
        storytelling: { base: 45000, growth: 10, volatility: 0.3 },
    };

    const config = nicheConfig[niche.toLowerCase()] || { base: 65000, growth: 7, volatility: 0.3 };

    // Use a seed based on niche for consistent results per niche
    const seed = niche.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const pseudoRandom = (i: number) => {
        const x = Math.sin(seed + i) * 10000;
        return x - Math.floor(x);
    };

    return {
        data: days.map((day, index) => ({
            day,
            views: Math.floor(config.base + (pseudoRandom(index) - 0.5) * config.base * config.volatility + index * 3000),
        })),
        growth: config.growth,
    };
}

function formatViews(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
}

export function NicheViewsChart({ niche }: NicheViewsChartProps) {
    const { data, growth } = generateViewsData(niche);
    const maxViews = Math.max(...data.map((d) => d.views));
    const totalViews = data.reduce((sum, d) => sum + d.views, 0);
    const avgViews = Math.floor(totalViews / data.length);
    const isPositive = growth >= 0;

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <span className="text-2xl">📊</span>
                        Niche Performance This Week
                    </CardTitle>
                    <Badge variant="secondary" className="font-normal gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatViews(avgViews)} avg/day
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Chart */}
                    <div className="flex items-end justify-between gap-2 h-48 pt-4">
                        {data.map((item, index) => {
                            const height = (item.views / maxViews) * 100;
                            return (
                                <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {formatViews(item.views)}
                                    </span>
                                    <div className="w-full flex items-end justify-center h-32">
                                        <div
                                            className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-violet-600 to-purple-400 transition-all duration-500"
                                            style={{ height: `${height}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium">{item.day}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{formatViews(totalViews)}</p>
                            <p className="text-xs text-muted-foreground">Total Views</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{formatViews(avgViews)}</p>
                            <p className="text-xs text-muted-foreground">Avg/Day</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                {isPositive ? '+' : ''}{growth}%
                            </p>
                            <p className="text-xs text-muted-foreground">vs Last Week</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

