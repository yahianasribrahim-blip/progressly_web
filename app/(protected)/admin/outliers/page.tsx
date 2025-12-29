"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ExternalLink, TrendingUp, Users, Eye } from "lucide-react";

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

const PRESET_HASHTAGS = [
    "contentcreator",
    "tiktokgrowth",
    "viralvideo",
    "saas",
    "startup",
    "aitools",
    "socialmediamarketing",
];

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

export default function OutlierFinderPage() {
    const [loading, setLoading] = useState(false);
    const [outliers, setOutliers] = useState<OutlierVideo[]>([]);
    const [customHashtag, setCustomHashtag] = useState("");
    const [searchedHashtags, setSearchedHashtags] = useState<string[]>([]);
    const [totalScanned, setTotalScanned] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const searchOutliers = async (hashtag?: string) => {
        setLoading(true);
        setError(null);

        try {
            const url = hashtag
                ? `/api/admin/outliers?hashtag=${encodeURIComponent(hashtag)}`
                : `/api/admin/outliers`;

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch outliers");
            }

            setOutliers(data.outliers || []);
            setSearchedHashtags(data.hashtags || []);
            setTotalScanned(data.totalVideosScanned || 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    const handleCustomSearch = () => {
        if (customHashtag.trim()) {
            searchOutliers(customHashtag.trim().replace("#", ""));
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">🔥 Outlier Finder</h1>
                <p className="text-muted-foreground">
                    Find viral video ideas for Progressly (views ≥ 5x creator's followers)
                </p>
            </div>

            {/* Search Controls */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Hashtags</CardTitle>
                    <CardDescription>
                        Click a preset or enter a custom hashtag
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Preset hashtags */}
                    <div className="flex flex-wrap gap-2">
                        {PRESET_HASHTAGS.map((tag) => (
                            <Button
                                key={tag}
                                variant="outline"
                                size="sm"
                                onClick={() => searchOutliers(tag)}
                                disabled={loading}
                            >
                                #{tag}
                            </Button>
                        ))}
                    </div>

                    {/* Custom hashtag input */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter custom hashtag..."
                            value={customHashtag}
                            onChange={(e) => setCustomHashtag(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
                            disabled={loading}
                        />
                        <Button onClick={handleCustomSearch} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Default search button */}
                    <Button
                        onClick={() => searchOutliers()}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Scanning videos...
                            </>
                        ) : (
                            <>
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Search All Default Hashtags
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
                            Searched: {searchedHashtags.map(t => `#${t}`).join(", ")} •
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
            {!loading && outliers.length === 0 && searchedHashtags.length > 0 && (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        No outliers found. Try different hashtags or lower the ratio threshold.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
