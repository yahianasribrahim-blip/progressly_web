"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, TrendingUp, Users, Eye, Sparkles } from "lucide-react";

interface OutlierVideo {
    id: string;
    description: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    creatorUsername: string;
    creatorFollowers: number;
    outlierRatio: number;
    thumbnail: string;
    url: string;
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

export default function OutlierFinderPage() {
    const [loading, setLoading] = useState(false);
    const [outliers, setOutliers] = useState<OutlierVideo[]>([]);
    const [searchedAccounts, setSearchedAccounts] = useState<string[]>([]);
    const [totalScanned, setTotalScanned] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [debugLog, setDebugLog] = useState<string[]>([]);

    const findViralIdeas = async () => {
        setLoading(true);
        setError(null);
        setDebugLog([]);

        try {
            const response = await fetch("/api/admin/outliers");
            const data = await response.json();

            // Capture debug log regardless of success/error
            if (data.debug) {
                setDebugLog(data.debug);
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch outliers");
            }

            setOutliers(data.outliers || []);
            setSearchedAccounts(data.accounts || []);
            setTotalScanned(data.totalVideosScanned || 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">🔥 What Video Should Progressly Make Next?</h1>
                <p className="text-muted-foreground">
                    Find viral video ideas from successful SaaS companies like Duolingo, Canva, Notion
                </p>
            </div>

            {/* Single Action Button */}
            <Card>
                <CardHeader>
                    <CardTitle>Find Viral Video Ideas</CardTitle>
                    <CardDescription>
                        Searches top SaaS TikTok accounts and finds their outlier videos (views &gt; 3x followers)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={findViralIdeas}
                        disabled={loading}
                        className="w-full h-12 text-lg"
                        size="lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Scanning SaaS TikTok accounts...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5 mr-2" />
                                Find Viral Ideas for Progressly
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
                        <CardTitle>
                            📊 Found {outliers.length} Outliers
                        </CardTitle>
                        <CardDescription>
                            Searched: {searchedAccounts.map(a => `@${a}`).join(", ")} •
                            Scanned {totalScanned} videos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {outliers.map((video) => (
                                <div
                                    key={video.id}
                                    className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50"
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
                                        </div>
                                    ) : (
                                        <div className="w-24 h-32 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                                            <Eye className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        {/* Ratio badge */}
                                        <Badge className="mb-2" variant={video.outlierRatio >= 10 ? "default" : "secondary"}>
                                            {video.outlierRatio}x 🔥
                                        </Badge>

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
                                            Watch on TikTok <ExternalLink className="h-3 w-3" />
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
                        No outlier videos found with views &gt; 3x follower count. Check the debug log for details.
                    </CardContent>
                </Card>
            )}

            {/* Debug Log */}
            {debugLog.length > 0 && (
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
    );
}
