"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, Lightbulb, Volume2, Sparkles, Eye, Heart, Share2, Zap, Bookmark, Check } from "lucide-react";

interface TrendingFormat {
    id: string;
    formatName: string;
    formatDescription: string;
    whyItWorks: string;
    howToApply: string[];
    halalAudioSuggestions: string[];
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
    const [loadingNiche, setLoadingNiche] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [niche, setNiche] = useState<string>("");
    const [fetchedNiche, setFetchedNiche] = useState<string>("");
    // Map format.id -> database savedTrend.id for unsaving
    const [savedFormats, setSavedFormats] = useState<Map<string, string>>(new Map());
    const [savingId, setSavingId] = useState<string | null>(null);

    // Fetch saved niche from creator settings on mount
    useEffect(() => {
        async function fetchSavedNiche() {
            try {
                const response = await fetch("/api/creator-setup");
                const data = await response.json();
                if (data.creatorSetup?.contentNiche) {
                    setNiche(data.creatorSetup.contentNiche);
                }
            } catch (error) {
                console.error("Error fetching saved niche:", error);
            } finally {
                setLoadingNiche(false);
            }
        }
        fetchSavedNiche();
    }, []);

    const fetchFormats = async () => {
        if (!niche.trim()) {
            setError("Please enter your content niche");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/formats/trending?niche=${encodeURIComponent(niche.trim())}`);
            const data = await response.json();

            if (data.success) {
                setFormats(data.data.formats.slice(0, 3));
                setFetchedNiche(niche.trim());
                setHasFetched(true);
            } else {
                const debugInfo = data.debug
                    ? `\n\nDebug: ${JSON.stringify(data.debug, null, 2)}`
                    : "";
                setError(`${data.error || "Failed to fetch trending formats"}${debugInfo}`);
                setHasFetched(true);
            }
        } catch (err) {
            setError(`Network error: ${err instanceof Error ? err.message : "Unknown error"}`);
            console.error("Error fetching formats:", err);
            setHasFetched(true);
        } finally {
            setLoading(false);
        }
    };

    const toggleSaveTrend = async (format: TrendingFormat) => {
        setSavingId(format.id);

        const existingSavedId = savedFormats.get(format.id);

        try {
            if (existingSavedId) {
                const response = await fetch(`/api/trends/${existingSavedId}`, {
                    method: "DELETE",
                });

                if (response.ok) {
                    setSavedFormats(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(format.id);
                        return newMap;
                    });
                }
            } else {
                const response = await fetch("/api/trends", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        formatName: format.formatName,
                        formatDescription: format.formatDescription,
                        whyItWorks: format.whyItWorks,
                        howToApply: format.howToApply,
                        halalAudio: format.halalAudioSuggestions,
                        niches: [fetchedNiche],
                        avgStats: format.avgStats,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setSavedFormats(prev => new Map(prev).set(format.id, data.data.id));
                }
            }
        } catch (err) {
            console.error("Error toggling trend save:", err);
        } finally {
            setSavingId(null);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && niche.trim() && !loading) {
            fetchFormats();
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
                                Discover formats tailored to your content niche
                            </p>
                        </div>
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
                        <div className="text-center max-w-lg w-full">
                            <h2 className="text-xl font-semibold mb-2">Get Trending Formats</h2>

                            {loadingNiche ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                                    <span className="ml-2 text-muted-foreground">Loading your content profile...</span>
                                </div>
                            ) : niche ? (
                                <>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        AI will generate formats personalized to your content style
                                    </p>
                                    <div className="mb-6 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Your Content Profile</p>
                                        <p className="text-sm text-muted-foreground line-clamp-3">{niche}</p>
                                    </div>
                                    <Button
                                        onClick={fetchFormats}
                                        size="lg"
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                    >
                                        <Zap className="h-5 w-5 mr-2" />
                                        Get Trending Formats
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        You need to complete your content profile first so we can personalize format suggestions.
                                    </p>
                                    <Button
                                        onClick={() => window.location.href = "/dashboard/settings"}
                                        size="lg"
                                        variant="outline"
                                    >
                                        Complete Your Profile
                                    </Button>
                                </>
                            )}
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
                            <p className="font-medium">Finding trending formats for &quot;{niche}&quot;...</p>
                            <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error State */}
            {error && !loading && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="p-6">
                        <p className="text-red-600 font-medium mb-2">Error fetching formats</p>
                        <pre className="text-xs bg-red-100 dark:bg-red-900/30 p-3 rounded overflow-auto whitespace-pre-wrap text-red-800 dark:text-red-200">
                            {error}
                        </pre>
                        <Button variant="outline" className="mt-4" onClick={fetchFormats}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Formats Grid - Only after fetching */}
            {hasFetched && !loading && !error && formats.length > 0 && (
                <>
                    {/* Niche Indicator & Change */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-sm py-1 px-3">
                                {fetchedNiche}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                Customized for your niche
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="text"
                                placeholder="Try a different niche..."
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-64"
                            />
                            <Button
                                variant="outline"
                                onClick={fetchFormats}
                                disabled={!niche.trim() || loading}
                            >
                                Update
                            </Button>
                        </div>
                    </div>

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
                                        {/* Save/Unsave Button */}
                                        <Button
                                            variant={savedFormats.has(format.id) ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => toggleSaveTrend(format)}
                                            disabled={savingId === format.id}
                                        >
                                            {savingId === format.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : savedFormats.has(format.id) ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Saved
                                                </>
                                            ) : (
                                                <>
                                                    <Bookmark className="h-4 w-4 mr-1" />
                                                    Save
                                                </>
                                            )}
                                        </Button>
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

                                    {/* How to Apply - NICHE SPECIFIC */}
                                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50">
                                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                            <TrendingUp className="h-4 w-4" />
                                            How to Apply This to Your Content
                                        </h4>
                                        <ul className="space-y-2">
                                            {format.howToApply.map((idea, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm">
                                                    <span className="text-purple-600 mt-1">•</span>
                                                    <span className="text-purple-900 dark:text-purple-200">{idea}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Halal Audio Suggestions */}
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
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Refresh Button & Request Count */}
                    <div className="flex flex-col items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={fetchFormats}
                            disabled={loading || !niche.trim()}
                        >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Get Fresh Formats
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
