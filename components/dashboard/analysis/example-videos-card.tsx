"use client";

import { useState } from "react";
import { ExternalLink, Lock, Eye, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ExampleVideo } from "@/lib/mock-analysis";
import { Icons } from "@/components/shared/icons";

interface ExampleVideosCardProps {
    videos: ExampleVideo[];
    isPremium: boolean;
    plan: "free" | "starter" | "pro";
}

export function ExampleVideosCard({ videos, isPremium, plan }: ExampleVideosCardProps) {
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [pendingUrl, setPendingUrl] = useState<string | null>(null);

    const handleVideoClick = (url: string, e: React.MouseEvent) => {
        e.preventDefault();
        setPendingUrl(url);
        setShowDisclaimer(true);
    };

    const confirmOpenVideo = () => {
        if (pendingUrl) {
            window.open(pendingUrl, "_blank", "noopener,noreferrer");
        }
        setShowDisclaimer(false);
        setPendingUrl(null);
    };

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

    // Use all videos from the API (already filtered/sorted by the backend)
    // Determine how many videos to show based on plan
    const maxVideos = plan === "pro" ? 8 : plan === "starter" ? 4 : 0;
    const displayVideos = videos.slice(0, maxVideos);

    const getLockedLabel = (index: number): string | null => {
        // For free plan, all videos are locked
        if (plan === "free") {
            return "Upgrade to view";
        }
        // For starter, videos after index 3 are locked (Pro only)
        if (plan === "starter" && index >= 4) {
            return "Pro Only";
        }
        // Pro plan has no locks
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
                        {displayVideos.length} real video{displayVideos.length !== 1 ? "s" : ""}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {displayVideos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">😕 No videos found from the last 7 days</p>
                        <p className="text-sm mt-2">Try a different niche or check back later for fresh content.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {displayVideos.map((video, index) => {
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
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            {video.daysAgo !== null && video.daysAgo !== undefined && (
                                                <Badge className={cn("text-xs", video.daysAgo <= 7 ? "bg-green-500/90" : video.daysAgo <= 30 ? "bg-yellow-500/90" : "bg-red-500/90")}>
                                                    {video.daysAgo <= 7 ? `${video.daysAgo}d` : video.daysAgo <= 30 ? `${Math.floor(video.daysAgo / 7)}w` : `${Math.floor(video.daysAgo / 30)}mo`}
                                                </Badge>
                                            )}
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
                                                <button
                                                    onClick={(e) => handleVideoClick(video.url, e)}
                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            {/* Music Disclaimer Dialog */}
            <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <AlertTriangle className="h-5 w-5" />
                            Important Reminder
                        </DialogTitle>
                        <DialogDescription className="text-left pt-4 space-y-3">
                            <p>
                                According to the majority of scholars, <strong>music with instruments is considered haram</strong>.
                                Many trending videos contain music that may not align with Islamic values.
                            </p>
                            <p>
                                We strongly encourage you to <strong>avoid using music in your content</strong>.
                                Barakah (blessing) comes from following Allah's guidance, not from chasing views.
                            </p>
                            <p className="text-sm text-muted-foreground italic">
                                This video is shown for educational reference only - to understand video formats and hooks,
                                not to copy music or haram content.
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDisclaimer(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmOpenVideo}
                            className="w-full sm:w-auto"
                        >
                            I Understand, Open Video
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
