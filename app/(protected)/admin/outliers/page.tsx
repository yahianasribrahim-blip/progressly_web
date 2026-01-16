"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2, ExternalLink, TrendingUp, Users, Eye, Sparkles,
    Plus, X, Instagram, Clock, Search
} from "lucide-react";

interface OutlierVideo {
    id: string;
    description: string;
    views: number;
    likes: number;
    comments: number;
    creatorUsername: string;
    creatorFollowers: number;
    outlierRatio: number;
    thumbnail: string;
    url: string;
    platform: "instagram" | "tiktok";
    daysAgo: number;
}

interface Creator {
    username: string;
    platform: "instagram" | "tiktok";
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
    );
}

const STORAGE_KEY = "outlier-research-creators";

export default function OutlierResearchPage() {
    const [loading, setLoading] = useState(false);
    const [outliers, setOutliers] = useState<OutlierVideo[]>([]);
    const [creators, setCreators] = useState<Creator[]>([]);
    const [newUsername, setNewUsername] = useState("");
    const [newPlatform, setNewPlatform] = useState<"instagram" | "tiktok">("instagram");
    const [error, setError] = useState<string | null>(null);
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [searchedAccounts, setSearchedAccounts] = useState<string[]>([]);

    // Load creators from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setCreators(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load saved creators:", e);
        }
    }, []);

    // Save creators to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(creators));
        } catch (e) {
            console.error("Failed to save creators:", e);
        }
    }, [creators]);

    const addCreator = () => {
        const username = newUsername.trim().replace("@", "");
        if (!username) return;

        // Check for duplicates
        const exists = creators.some(c => c.username.toLowerCase() === username.toLowerCase() && c.platform === newPlatform);
        if (exists) {
            setError(`@${username} is already in the list`);
            return;
        }

        setCreators([...creators, { username, platform: newPlatform }]);
        setNewUsername("");
        setError(null);
    };

    const removeCreator = (index: number) => {
        setCreators(creators.filter((_, i) => i !== index));
    };

    const findOutliers = async () => {
        if (creators.length === 0) {
            setError("Add at least one creator to search");
            return;
        }

        setLoading(true);
        setError(null);
        setDebugLog([]);
        setOutliers([]);

        try {
            const response = await fetch("/api/admin/outliers/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creators }),
            });

            const data = await response.json();

            if (data.debug) {
                setDebugLog(data.debug);
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch outliers");
            }

            setOutliers(data.outliers || []);
            setSearchedAccounts(data.accounts || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    const instagramCreators = creators.filter(c => c.platform === "instagram");
    const tiktokCreators = creators.filter(c => c.platform === "tiktok");

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                    Outlier Research Tool
                </h1>
                <p className="text-muted-foreground">
                    Find viral videos from your competitors. An outlier = 5x+ views compared to followers.
                </p>
            </div>

            {/* Creator List Management */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Competitor List</CardTitle>
                    <CardDescription>
                        Add Instagram or TikTok creators in your niche. The tool will find their outlier videos from the last 90 days.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add Creator Form */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Label htmlFor="username" className="sr-only">Username</Label>
                            <Input
                                id="username"
                                placeholder="Enter username (without @)"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addCreator()}
                            />
                        </div>
                        <Tabs value={newPlatform} onValueChange={(v) => setNewPlatform(v as "instagram" | "tiktok")}>
                            <TabsList>
                                <TabsTrigger value="instagram" className="gap-1">
                                    <Instagram className="h-4 w-4" />
                                    IG
                                </TabsTrigger>
                                <TabsTrigger value="tiktok" className="gap-1">
                                    <TikTokIcon className="h-4 w-4" />
                                    TT
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button onClick={addCreator}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>

                    {/* Creator Lists */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Instagram Creators */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-pink-600">
                                <Instagram className="h-4 w-4" />
                                Instagram ({instagramCreators.length})
                            </div>
                            <div className="min-h-[80px] border rounded-lg p-2 space-y-1">
                                {instagramCreators.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No Instagram creators added</p>
                                ) : (
                                    instagramCreators.map((creator, globalIndex) => {
                                        const idx = creators.indexOf(creator);
                                        return (
                                            <div key={idx} className="flex items-center justify-between bg-pink-50 dark:bg-pink-950/30 rounded px-2 py-1">
                                                <span className="text-sm">@{creator.username}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeCreator(idx)}
                                                    className="h-6 w-6 p-0 hover:bg-red-100"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* TikTok Creators */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <TikTokIcon className="h-4 w-4" />
                                TikTok ({tiktokCreators.length})
                            </div>
                            <div className="min-h-[80px] border rounded-lg p-2 space-y-1">
                                {tiktokCreators.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No TikTok creators added</p>
                                ) : (
                                    tiktokCreators.map((creator) => {
                                        const idx = creators.indexOf(creator);
                                        return (
                                            <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/30 rounded px-2 py-1">
                                                <span className="text-sm">@{creator.username}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeCreator(idx)}
                                                    className="h-6 w-6 p-0 hover:bg-red-100"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search Button */}
                    <Button
                        onClick={findOutliers}
                        disabled={loading || creators.length === 0}
                        className="w-full h-12 text-lg"
                        size="lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Searching {creators.length} creators...
                            </>
                        ) : (
                            <>
                                <Search className="h-5 w-5 mr-2" />
                                Find Outlier Videos
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Error */}
            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-4">
                        <p className="text-red-500">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {outliers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            Found {outliers.length} Outlier Videos
                        </CardTitle>
                        <CardDescription>
                            Videos with 5x+ views compared to creator&apos;s followers
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {outliers.map((video) => (
                                <div
                                    key={`${video.platform}-${video.id}`}
                                    className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    {/* Thumbnail */}
                                    {video.thumbnail ? (
                                        <div className="relative w-24 h-32 flex-shrink-0 rounded overflow-hidden bg-muted">
                                            <Image
                                                src={video.thumbnail}
                                                alt="Video thumbnail"
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                            {/* Platform badge */}
                                            <div className={`absolute top-1 left-1 p-1 rounded ${video.platform === "instagram" ? "bg-pink-500" : "bg-black"}`}>
                                                {video.platform === "instagram" ? (
                                                    <Instagram className="h-3 w-3 text-white" />
                                                ) : (
                                                    <TikTokIcon className="h-3 w-3 text-white" />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-24 h-32 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                                            <Eye className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        {/* Ratio badge */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge className={video.outlierRatio >= 10 ? "bg-red-500" : video.outlierRatio >= 7 ? "bg-orange-500" : "bg-purple-500"}>
                                                {video.outlierRatio}x 🔥
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {video.daysAgo}d ago
                                            </Badge>
                                        </div>

                                        {/* Creator */}
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                            <Users className="h-3 w-3" />
                                            @{video.creatorUsername} • {formatNumber(video.creatorFollowers)} followers
                                        </div>

                                        {/* Views */}
                                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                            <Eye className="h-3 w-3" />
                                            {formatNumber(video.views)} views
                                            <span className="text-muted-foreground">
                                                ({formatNumber(video.likes)} likes)
                                            </span>
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {video.description || "No description"}
                                        </p>

                                        {/* Link */}
                                        <a
                                            href={video.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                                        >
                                            Watch on {video.platform === "instagram" ? "Instagram" : "TikTok"}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* No results */}
            {!loading && outliers.length === 0 && searchedAccounts.length > 0 && (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        No outlier videos found with 5x+ views-to-followers ratio in the last 90 days.
                        <br />
                        <span className="text-xs">Check the debug log for details.</span>
                    </CardContent>
                </Card>
            )}

            {/* Debug Log Toggle */}
            {debugLog.length > 0 && (
                <div className="space-y-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDebug(!showDebug)}
                    >
                        {showDebug ? "Hide" : "Show"} Debug Log ({debugLog.length} entries)
                    </Button>

                    {showDebug && (
                        <Card>
                            <CardHeader>
                                <CardTitle>🔧 Debug Log</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted p-4 rounded text-xs font-mono max-h-96 overflow-y-auto">
                                    {debugLog.map((line, i) => (
                                        <div key={i} className="py-0.5">{line}</div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
