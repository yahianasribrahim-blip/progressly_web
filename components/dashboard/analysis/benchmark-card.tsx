"use client";

import { TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Benchmark } from "@/lib/mock-analysis";

interface BenchmarkCardProps {
    benchmark: Benchmark;
}

export function BenchmarkCard({ benchmark }: BenchmarkCardProps) {
    return (
        <Card className="border-2 border-dashed">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <span className="text-2xl">📊</span>
                    Performance Benchmark
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Benchmark Display */}
                <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-600 mb-2">
                        <TrendingUp className="h-5 w-5" />
                        <span className="text-sm font-medium">Expected Performance</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground mb-1">
                        {benchmark.viewRange} views
                    </p>
                    <p className="text-muted-foreground">
                        within {benchmark.timeframe}
                    </p>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                            This is a benchmark, not a guarantee.
                        </p>
                        <p className="text-amber-700 dark:text-amber-300 mt-1">
                            Progressly shows patterns from content that is already performing.
                            Actual results depend on execution quality, timing, and audience engagement.
                        </p>
                    </div>
                </div>

                {/* Context */}
                <p className="text-sm text-muted-foreground text-center">
                    Based on analysis of top-performing content in your niche over the past 7 days.
                </p>
            </CardContent>
        </Card>
    );
}
