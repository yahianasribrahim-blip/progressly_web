"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Lightbulb, Volume2, Eye, Heart, Share2, Trash2, Loader2 } from "lucide-react";

interface SavedTrend {
    id: string;
    formatName: string;
    formatDescription: string;
    whyItWorks: string;
    howToApply: string[];
    halalAudio: string[];
    niches: string[];
    avgStats?: {
        views: string;
        likes: string;
        shares: string;
    };
    status: string;
    createdAt: string;
}

export default function TrendBankPage() {
    const [trends, setTrends] = useState<SavedTrend[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchTrends = async () => {
        try {
            const response = await fetch("/api/trends");
            const data = await response.json();

            if (data.success) {
                setTrends(data.data);
            }
        } catch (error) {
            console.error("Error fetching trends:", error);
        } finally {
            setLoading(false);
        }
    };

    const deleteTrend = async (id: string) => {
        setDeletingId(id);
        try {
            const response = await fetch(`/api/trends/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setTrends(prev => prev.filter(t => t.id !== id));
            }
        } catch (error) {
            console.error("Error deleting trend:", error);
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        fetchTrends();
    }, []);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Trend Bank</h1>
                    <p className="text-muted-foreground text-sm">
                        Your saved trending formats to apply later
                    </p>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
            )}

            {/* Empty State */}
            {!loading && trends.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="p-4 rounded-full bg-muted">
                            <TrendingUp className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium">No saved trends yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Save trending formats from the Trending Formats page to access them here
                            </p>
                        </div>
                        <Button variant="outline" asChild>
                            <a href="/dashboard/trending-formats">Browse Trending Formats</a>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Saved Trends Grid */}
            {!loading && trends.length > 0 && (
                <div className="grid gap-6">
                    {trends.map((trend) => (
                        <Card key={trend.id} className="overflow-hidden">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{trend.formatName}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {trend.formatDescription}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteTrend(trend.id)}
                                        disabled={deletingId === trend.id}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        {deletingId === trend.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Stats Row */}
                                {trend.avgStats && (
                                    <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Eye className="h-4 w-4" />
                                                <span className="text-xs">Avg Views</span>
                                            </div>
                                            <p className="font-semibold">{trend.avgStats.views}</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Heart className="h-4 w-4" />
                                                <span className="text-xs">Avg Likes</span>
                                            </div>
                                            <p className="font-semibold">{trend.avgStats.likes}</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Share2 className="h-4 w-4" />
                                                <span className="text-xs">Avg Shares</span>
                                            </div>
                                            <p className="font-semibold">{trend.avgStats.shares}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Why It Works */}
                                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50">
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm mb-1">
                                        <Lightbulb className="h-4 w-4" />
                                        Why This Works
                                    </div>
                                    <p className="text-sm text-amber-900 dark:text-amber-200">
                                        {trend.whyItWorks}
                                    </p>
                                </div>

                                {/* How to Apply */}
                                <div>
                                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-purple-600" />
                                        How You Can Apply This
                                    </h4>
                                    <ul className="space-y-2">
                                        {trend.howToApply.map((idea, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <span className="text-purple-600 mt-1">•</span>
                                                <span className="text-muted-foreground">{idea}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Halal Audio */}
                                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 font-medium text-sm mb-2">
                                        <Volume2 className="h-4 w-4" />
                                        Halal Audio Options
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {trend.halalAudio.map((audio, i) => (
                                            <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                                                {audio}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Niches & Date */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Works for:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {trend.niches.map((niche, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">
                                                    {niche}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        Saved {new Date(trend.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
