"use client";

import { ExternalLink, Lock, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ExampleVideo } from "@/lib/mock-analysis";
import { Icons } from "@/components/shared/icons";

interface ExampleVideosCardProps {
    videos: ExampleVideo[];
    isPremium: boolean;
    plan: "free" | "starter" | "pro";
}

export function ExampleVideosCard({ videos, isPremium, plan }: ExampleVideosCardProps) {
    const getPlatformIcon = (platform: ExampleVideo["platform"]) => {
        switch (platform) {
            case "TikTok":
                return <Icons.tiktok className="h-3 w-3" />;
            case "Instagram":
                return <Icons.instagram className="h-3 w-3" />;
            case "YouTube":
                return <Icons.youtube className="h-3 w-3" />;
        }
    };

    const getPlatformColor = (platform: ExampleVideo["platform"]) => {
        switch (platform) {
            case "TikTok":
                return "bg-black text-white";
            case "Instagram":
                return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
            case "YouTube":
                return "bg-red-600 text-white";
        }
    };

    // Create 8 videos (4 for starter, 4 for starter+pro)
    const allVideos = [
        ...videos,
        // Additional mock videos to fill up to 8
        {
            id: "v5",
            thumbnail: "/api/placeholder/320/180",
            creator: "@creativemind",
            platform: "TikTok" as const,
            views: "1.8M",
            url: "https://tiktok.com",
        },
        {
            id: "v6",
            thumbnail: "/api/placeholder/320/180",
            creator: "@trendylife",
            platform: "Instagram" as const,
            views: "650K",
            url: "https://instagram.com",
        },
        {
            id: "v7",
            thumbnail: "/api/placeholder/320/180",
            creator: "@viralcreator",
            platform: "YouTube" as const,
            views: "2.1M",
            url: "https://youtube.com",
        },
        {
            id: "v8",
            thumbnail: "/api/placeholder/320/180",
            creator: "@contentpro",
            platform: "TikTok" as const,
            views: "920K",
            url: "https://tiktok.com",
        },
    ];

    const getLockedLabel = (index: number): string | null => {
        // For free plan, show lock labels
        if (plan === "free") {
            if (index < 4) return "Starter Only";
            return "Starter & Pro";
        }
        // For starter plan, only the last 4 are locked
        if (plan === "starter") {
            if (index >= 4) return "Pro Only";
            return null;
        }
        // Pro plan has access to all
        return null;
    };

    const isLocked = (index: number): boolean => {
        if (plan === "pro") return false;
        if (plan === "starter") return index >= 4;
        return true; // Free users: all locked
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <span className="text-2xl">📹</span>
                        Example Videos
                        <span className="text-sm font-normal text-muted-foreground">(Reference Only)</span>
                    </CardTitle>
                    <Badge variant="secondary" className="font-normal">
                        {allVideos.length} videos
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {allVideos.map((video, index) => {
                        const locked = isLocked(index);
                        const lockLabel = getLockedLabel(index);

                        return (
                            <div
                                key={video.id}
                                className={cn(
                                    "group relative overflow-hidden rounded-xl border bg-muted transition-all hover:shadow-lg",
                                    locked && "pointer-events-none"
                                )}
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
                                    {/* Placeholder gradient thumbnail */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className={cn(
                                            "rounded-full p-4",
                                            getPlatformColor(video.platform)
                                        )}>
                                            {getPlatformIcon(video.platform)}
                                        </div>
                                    </div>

                                    {/* Views Badge */}
                                    <div className="absolute bottom-2 left-2">
                                        <Badge variant="secondary" className="gap-1 bg-black/70 text-white text-xs">
                                            <Eye className="h-3 w-3" />
                                            {video.views}
                                        </Badge>
                                    </div>

                                    {/* Platform Badge */}
                                    <div className="absolute top-2 right-2">
                                        <Badge className={cn("text-xs", getPlatformColor(video.platform))}>
                                            {video.platform}
                                        </Badge>
                                    </div>

                                    {/* Blur Overlay for Locked Videos */}
                                    {locked && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                                            <Lock className="h-6 w-6 text-muted-foreground mb-2" />
                                            <span className="text-xs font-medium text-muted-foreground">{lockLabel}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Video Info */}
                                <div className="p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium truncate">
                                            {video.creator}
                                        </span>
                                        {!locked && (
                                            <a
                                                href={video.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
