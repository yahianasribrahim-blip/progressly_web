"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Lightbulb,
    TrendingUp,
    Clock,
    MessageSquare,
    AlertTriangle,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInsights {
    summary: string;
    contentIdeas: string[];
    bestPostingStrategy: string;
    hookRecommendations: string[];
    warnings: string[];
}

interface AIInsightsCardProps {
    insights: AIInsights;
    isLoading?: boolean;
}

export function AIInsightsCard({ insights, isLoading }: AIInsightsCardProps) {
    if (isLoading) {
        return (
            <Card className="border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
                        Generating AI Insights...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="h-4 bg-muted/50 rounded animate-pulse" />
                        <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4" />
                        <div className="h-4 bg-muted/50 rounded animate-pulse w-1/2" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-6 w-6 text-violet-500" />
                    AI-Powered Insights
                    <Badge variant="secondary" className="ml-2 bg-violet-500/10 text-violet-600">
                        Personalized
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary */}
                <div className="p-4 bg-background/50 rounded-lg border">
                    <p className="text-muted-foreground leading-relaxed">
                        {insights.summary}
                    </p>
                </div>

                {/* Content Ideas */}
                <div>
                    <h4 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Content Ideas for This Week
                    </h4>
                    <ul className="space-y-2">
                        {insights.contentIdeas.map((idea, index) => (
                            <li key={index} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border hover:border-violet-500/50 transition-colors">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                </span>
                                <span className="text-sm">{idea}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Hook Recommendations */}
                <div>
                    <h4 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        Hook Patterns That Work
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {insights.hookRecommendations.map((hook, index) => (
                            <div
                                key={index}
                                className="px-3 py-2 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg text-sm border border-blue-500/20"
                            >
                                💡 {hook}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Warnings */}
                {insights.warnings && insights.warnings.length > 0 && (
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Things to Watch Out For
                        </h4>
                        <ul className="space-y-2">
                            {insights.warnings.map((warning, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300"
                                >
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    {warning}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Call to Action - Video Idea Generator */}
                <div className="pt-4 border-t space-y-4">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                            Ready to create content? Get a detailed video concept:
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        🔄 These insights are based on real-time TikTok trends. Run another analysis next week to see what's new!
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
