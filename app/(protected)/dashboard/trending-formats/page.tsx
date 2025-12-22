"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, RefreshCw, Lightbulb, Volume2, Sparkles } from "lucide-react";

interface TrendingFormat {
    id: string;
    formatName: string;
    formatDescription: string;
    whyItWorks: string;
    howMuslimCreatorsCanApply: string[];
    halalAudioSuggestions: string[];
    exampleNiches: string[];
    engagementPotential: "High" | "Medium" | "Low";
}

export default function TrendingFormatsPage() {
    const [formats, setFormats] = useState<TrendingFormat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<string>("");

    const fetchFormats = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/formats/trending");
            const data = await response.json();

            if (data.success) {
                setFormats(data.data.formats);
                setSource(data.data.source);
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

    useEffect(() => {
        fetchFormats();
    }, []);

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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Trending Formats</h1>
                            <p className="text-muted-foreground text-sm">
                                Formats that are working right now - ready for you to adapt
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchFormats}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Refresh</span>
                    </Button>
                </div>

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
                                    Apply these structures to YOUR niche with YOUR halal audio. The format is what makes it trend, not the specific content.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-muted-foreground">Analyzing trending content...</p>
                </div>
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

            {/* Formats Grid */}
            {!loading && !error && formats.length > 0 && (
                <div className="grid gap-6">
                    {formats.map((format, index) => (
                        <Card key={format.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 font-bold text-sm">
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

                                {/* Halal Audio Suggestions */}
                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50">
                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium text-sm mb-2">
                                        <Volume2 className="h-4 w-4" />
                                        Halal Audio Options
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {format.halalAudioSuggestions.map((audio, i) => (
                                            <Badge key={i} variant="outline" className="bg-green-100/50 text-green-700 border-green-300">
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
                                            <Badge key={i} variant="secondary" className="text-xs">
                                                {niche}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Source indicator */}
            {!loading && source && (
                <p className="text-xs text-center text-muted-foreground">
                    {source === "live" ? "Based on live trending data" : "Showing recommended formats"}
                </p>
            )}
        </div>
    );
}
