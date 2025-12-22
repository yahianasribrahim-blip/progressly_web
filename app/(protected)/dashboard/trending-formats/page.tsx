"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Lightbulb, Volume2, Sparkles, Eye, Heart, Share2, Zap } from "lucide-react";

interface TrendingFormat {
    id: string;
    formatName: string;
    formatDescription: string;
    whyItWorks: string;
    howMuslimCreatorsCanApply: string[];
    halalAudioSuggestions: string[];
    exampleNiches: string[];
    engagementPotential: "High" | "Medium" | "Low";
    avgStats?: {
        views: string;
        likes: string;
        shares: string;
    };
}

export default function TrendingFormatsPage() {
    const [formats, setFormats] = useState<TrendingFormat[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<string>("");
    const [hasFetched, setHasFetched] = useState(false);

    const fetchFormats = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/formats/trending");
            const data = await response.json();

            if (data.success) {
                // Only show top 3 formats
                setFormats(data.data.formats.slice(0, 3));
                setSource(data.data.source);
                setHasFetched(true);
            } else {
                setError("Failed to fetch trending formats");
            }
        } catch (err) {
            setError("Error loading formats. Please try again.");
            console.error("Error fetching formats:", err);
        } finally {
            setLoading(false);
        }
    };

    const getEngagementColor = (potential: string) => {
        switch (potential) {
            case "High":
                return "bg-green-500/10 text-green-600 border-green-500/20";
            case "Medium":
                return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
            default:
                return "bg-gray-500/10 text-gray-600 border-gray-500/20";
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Trending Formats</h1>
                        <p className="text-muted-foreground text-sm">
                            Discover what formats are working right now
                        </p>
                    </div>
                </div>
            </div>

            {/* Initial State - Before fetching */}
            {!hasFetched && !loading && (
                <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800">
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
                        <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <Sparkles className="h-12 w-12 text-purple-600" />
                        </div>
                        <div className="text-center max-w-md">
                            <h2 className="text-xl font-semibold mb-2">Get Current Trending Formats</h2>
                            <p className="text-muted-foreground text-sm mb-6">
                                We&apos;ll analyze what&apos;s trending right now and show you the top 3 formats you can apply to your content with halal audio options.
                            </p>
                            <Button
                                onClick={fetchFormats}
                                size="lg"
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                                <Zap className="h-5 w-5 mr-2" />
                                Get Trending Formats
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading State */}
            {loading && (
                <Card className="border-purple-200 dark:border-purple-800">
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                        <div className="text-center">
                            <p className="font-medium">Analyzing trending content...</p>
                            <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error State */}
            {error && !loading && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="p-6 text-center">
                        <p className="text-red-600">{error}</p>
                        <Button variant="outline" className="mt-4" onClick={fetchFormats}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Formats Grid - Only after fetching */}
            {hasFetched && !loading && !error && formats.length > 0 && (
                <>
                    {/* Info Banner */}
                    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                        These are formats, not specific videos
                                    </p>
                                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                        Apply these structures to YOUR niche with YOUR halal audio. The format is what makes it trend.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6">
                        {formats.map((format, index) => (
                            <Card key={format.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{format.formatName}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    {format.formatDescription}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge className={getEngagementColor(format.engagementPotential)}>
                                            {format.engagementPotential} Potential
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    {/* Stats Row */}
                                    {format.avgStats && (
                                        <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50">
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                    <Eye className="h-4 w-4" />
                                                    <span className="text-xs">Avg Views</span>
                                                </div>
                                                <p className="font-semibold">{format.avgStats.views}</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                    <Heart className="h-4 w-4" />
                                                    <span className="text-xs">Avg Likes</span>
                                                </div>
                                                <p className="font-semibold">{format.avgStats.likes}</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                    <Share2 className="h-4 w-4" />
                                                    <span className="text-xs">Avg Shares</span>
                                                </div>
                                                <p className="font-semibold">{format.avgStats.shares}</p>
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
                                            {format.whyItWorks}
                                        </p>
                                    </div>

                                    {/* How to Apply */}
                                    <div>
                                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-purple-600" />
                                            How You Can Apply This
                                        </h4>
                                        <ul className="space-y-2">
                                            {format.howMuslimCreatorsCanApply.map((idea, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm">
                                                    <span className="text-purple-600 mt-1">•</span>
                                                    <span className="text-muted-foreground">{idea}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Halal Audio Suggestions - FIXED STYLING */}
                                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2 font-medium text-sm mb-2">
                                            <Volume2 className="h-4 w-4" />
                                            Halal Audio Options
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {format.halalAudioSuggestions.map((audio, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="secondary"
                                                    className="text-sm py-1 px-3"
                                                >
                                                    {audio}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Niches */}
                                    <div className="flex items-center gap-2 pt-2">
                                        <span className="text-xs text-muted-foreground">Works for:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {format.exampleNiches.map((niche, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">
                                                    {niche}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Refresh Button */}
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            onClick={fetchFormats}
                            disabled={loading}
                        >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Get Fresh Formats
                        </Button>
                    </div>

                    {/* Source indicator */}
                    {source && (
                        <p className="text-xs text-center text-muted-foreground">
                            {source === "live" ? "Based on live trending data" : "Showing recommended formats"}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
